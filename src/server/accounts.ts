import { randomUUID } from "node:crypto";
import type { Account } from "../lib/account";
import { rows, write, transaction, type Executor } from "./db";
import {
  digest,
  newToken,
  hashPassword,
  verifyPassword,
  DUMMY_HASH,
  HttpError,
  normalizedEmail,
  validName,
  validPassword,
} from "./security";
export type UserRow = Account & {
  password_hash: string;
  active: number;
  auth_version: number;
  created_at: number;
};
export type Session = Account & { auth_version: number; tokenHash: string };
const IDLE = 2 * 60 * 60 * 1000,
  ABSOLUTE = 12 * 60 * 60 * 1000;
export function sessionAlive(
  session: {
    last_seen: number;
    expires_at: number;
    active: number;
    auth_version: number;
    session_version: number;
  },
  now = Date.now(),
) {
  return (
    !!session.active &&
    session.auth_version === session.session_version &&
    session.expires_at > now &&
    session.last_seen > now - IDLE
  );
}
export async function event(
  actor: string | null,
  target: string | null,
  action: string,
  c: Executor,
) {
  await write(
    "INSERT INTO security_events (actor_id,target_id,action,created_at) VALUES (?,?,?,?)",
    [actor, target, action, Date.now()],
    c,
  );
}
export async function getSession(
  token: string | undefined,
): Promise<Session | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const tokenHash = digest(token);
  const [s] = await rows<
    UserRow & { session_version: number; last_seen: number; expires_at: number }
  >(
    "SELECT u.*,s.auth_version AS session_version,s.last_seen,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?",
    [tokenHash],
  );
  if (!s || !sessionAlive(s)) return null;
  await write(
    "UPDATE sessions SET last_seen=? WHERE token_hash=? AND last_seen>? AND expires_at>?",
    [Date.now(), tokenHash, Date.now() - IDLE, Date.now()],
  );
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    auth_version: s.auth_version,
    tokenHash,
  };
}
async function requireCurrent(actor: Session, c: Executor, admin = false) {
  const [user] = await rows<UserRow>(
    "SELECT * FROM users WHERE id=? FOR UPDATE",
    [actor.id],
    c,
  );
  const [session] = await rows<{
    last_seen: number;
    expires_at: number;
    session_version: number;
  }>(
    "SELECT last_seen,expires_at,auth_version AS session_version FROM sessions WHERE token_hash=? AND user_id=?",
    [actor.tokenHash, actor.id],
    c,
  );
  if (
    !user ||
    !session ||
    !sessionAlive({ ...user, ...session }) ||
    user.auth_version !== actor.auth_version
  )
    throw new HttpError(401, "Please sign in again.");
  if (admin && user.role !== "super_admin")
    throw new HttpError(403, "Super Admin access is required.");
  return user;
}
export async function limitLogin(email: string) {
  await transaction(async (c) => {
    const now = Date.now();
    for (const [bucket, max] of [
      [digest("global-login"), 100],
      [digest("account:" + email), 8],
    ] as const) {
      await write(
        "INSERT INTO login_limits(bucket,attempts,window_end) VALUES (?,0,?) ON DUPLICATE KEY UPDATE bucket=bucket",
        [bucket, now + 15 * 60 * 1000],
        c,
      );
      const [limit] = await rows<{ attempts: number; window_end: number }>(
        "SELECT attempts,window_end FROM login_limits WHERE bucket=? FOR UPDATE",
        [bucket],
        c,
      );
      if (limit.window_end <= now) {
        await write(
          "UPDATE login_limits SET attempts=1,window_end=? WHERE bucket=?",
          [now + 15 * 60 * 1000, bucket],
          c,
        );
      } else {
        if (limit.attempts >= max)
          throw new HttpError(
            429,
            "Too many sign-in attempts. Try again in 15 minutes.",
          );
        await write(
          "UPDATE login_limits SET attempts=attempts+1 WHERE bucket=?",
          [bucket],
          c,
        );
      }
    }
  });
}
export async function login(emailInput: unknown, passwordInput: unknown) {
  const email = normalizedEmail(emailInput);
  if (!email || typeof passwordInput !== "string" || passwordInput.length > 128)
    throw new HttpError(400, "Enter a valid email and password.");
  await limitLogin(email);
  const [user] = await rows<UserRow>("SELECT * FROM users WHERE email=?", [
    email,
  ]);
  const ok = await verifyPassword(
    passwordInput,
    user?.password_hash ?? DUMMY_HASH,
  );
  if (!ok || !user?.active)
    throw new HttpError(401, "Email or password is incorrect.");
  const token = newToken();
  await transaction(async (c) => {
    const [current] = await rows<UserRow>(
      "SELECT * FROM users WHERE id=? FOR UPDATE",
      [user.id],
      c,
    );
    if (!current?.active || current.auth_version !== user.auth_version)
      throw new HttpError(401, "Please sign in again.");
    const now = Date.now();
    await write(
      "DELETE FROM sessions WHERE user_id=? AND (expires_at<=? OR last_seen<=?)",
      [user.id, now, now - IDLE],
      c,
    );
    const existing = await rows<{ token_hash: string }>(
      "SELECT token_hash FROM sessions WHERE user_id=? ORDER BY created_at DESC",
      [user.id],
      c,
    );
    for (const old of existing.slice(4))
      await write(
        "DELETE FROM sessions WHERE token_hash=?",
        [old.token_hash],
        c,
      );
    await write(
      "INSERT INTO sessions(token_hash,user_id,auth_version,created_at,last_seen,expires_at) VALUES(?,?,?,?,?,?)",
      [digest(token), user.id, user.auth_version, now, now, now + ABSOLUTE],
      c,
    );
    await event(user.id, user.id, "login", c);
  });
  return token;
}
export async function logout(actor: Session) {
  await transaction(async (c) => {
    await write(
      "DELETE FROM sessions WHERE token_hash=?",
      [actor.tokenHash],
      c,
    );
    await event(actor.id, actor.id, "logout", c);
  });
}
export async function listTeam(actor: Session) {
  return transaction(async (c) => {
    await requireCurrent(actor, c, true);
    const users = await rows<Account & { active: number; created_at: number }>(
      "SELECT id,name,email,role,active,created_at FROM users ORDER BY created_at DESC",
      [],
      c,
    );
    const events = await rows<{
      id: number;
      actor_name: string;
      target_name: string | null;
      action: string;
      created_at: number;
    }>(
      "SELECT e.id,a.name AS actor_name,t.name AS target_name,e.action,e.created_at FROM security_events e LEFT JOIN users a ON a.id=e.actor_id LEFT JOIN users t ON t.id=e.target_id ORDER BY e.id DESC LIMIT 50",
      [],
      c,
    );
    return { users, events };
  });
}
export async function createTeam(
  actor: Session,
  input: Record<string, unknown>,
) {
  const email = normalizedEmail(input.email);
  if (!email || !validName(input.name) || !validPassword(input.password))
    throw new HttpError(
      400,
      "Enter a name, valid email and password of 12–128 characters.",
    );
  if (input.role !== undefined && input.role !== "team")
    throw new HttpError(400, "Only team accounts can be created here.");
  const name = input.name.trim(),
    hash = await hashPassword(input.password);
  return transaction(async (c) => {
    await requireCurrent(actor, c, true);
    const id = randomUUID();
    try {
      await write(
        "INSERT INTO users(id,name,email,password_hash,role,created_at) VALUES(?,?,?,?,?,?)",
        [id, name, email, hash, "team", Date.now()],
        c,
      );
    } catch (e) {
      if ((e as { code?: string }).code === "ER_DUP_ENTRY")
        throw new HttpError(409, "An account already uses this email.");
      throw e;
    }
    await event(actor.id, id, "team_created", c);
    return { id };
  });
}
export async function changeTeam(
  actor: Session,
  id: string,
  input: Record<string, unknown>,
) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new HttpError(400, "Invalid account.");
  if (
    input.action !== "activate" &&
    input.action !== "deactivate" &&
    input.action !== "reset_password"
  )
    throw new HttpError(400, "Invalid action.");
  if (input.action === "reset_password" && !validPassword(input.password))
    throw new HttpError(400, "Use a password of 12–128 characters.");
  const hash =
    input.action === "reset_password"
      ? await hashPassword(input.password as string)
      : null;
  await transaction(async (c) => {
    await requireCurrent(actor, c, true);
    const [target] = await rows<UserRow>(
      "SELECT * FROM users WHERE id=? FOR UPDATE",
      [id],
      c,
    );
    if (!target || target.role !== "team")
      throw new HttpError(403, "Only team accounts can be changed here.");
    if (hash)
      await write(
        "UPDATE users SET password_hash=?,auth_version=auth_version+1 WHERE id=?",
        [hash, id],
        c,
      );
    else
      await write(
        "UPDATE users SET active=?,auth_version=auth_version+1 WHERE id=?",
        [input.action === "activate" ? 1 : 0, id],
        c,
      );
    await write("DELETE FROM sessions WHERE user_id=?", [id], c);
    await event(actor.id, id, "team_" + input.action, c);
  });
}
export async function changeOwnPassword(
  actor: Session,
  current: unknown,
  next: unknown,
) {
  if (
    typeof current !== "string" ||
    current.length > 128 ||
    !validPassword(next)
  )
    throw new HttpError(
      400,
      "Enter your current password and a new password of 12–128 characters.",
    );
  const hash = await hashPassword(next);
  await transaction(async (c) => {
    const user = await requireCurrent(actor, c);
    if (!(await verifyPassword(current, user.password_hash)))
      throw new HttpError(400, "Current password is incorrect.");
    await write(
      "UPDATE users SET password_hash=?,auth_version=auth_version+1 WHERE id=?",
      [hash, actor.id],
      c,
    );
    await write("DELETE FROM sessions WHERE user_id=?", [actor.id], c);
    await event(actor.id, actor.id, "password_changed", c);
  });
}
