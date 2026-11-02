import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { rows, write, closeDb } from "../../src/server/db";
import { hashPassword, HttpError } from "../../src/server/security";
import {
  login,
  getSession,
  createTeam,
  changeTeam,
  changeOwnPassword,
  listTeam,
  logout,
  limitLogin,
} from "../../src/server/accounts";
test(
  "MySQL accounts, session revocation, permissions and audit history",
  { skip: process.env.TEST_DATABASE !== "true" },
  async () => {
    const id = randomUUID(),
      tag = randomUUID(),
      password = "fixture-only-password-" + tag,
      email = "admin-" + tag + "@example.test",
      teamEmail = "team-" + tag + "@example.test";
    const ids = [id];
    try {
      await write(
        "INSERT INTO users(id,name,email,password_hash,role,created_at) VALUES(?,?,?,?,?,?)",
        [
          id,
          "Test Admin",
          email,
          await hashPassword(password),
          "super_admin",
          Date.now(),
        ],
      );
      await assert.rejects(
        () => login(email, "wrong-password"),
        (e: unknown) => e instanceof HttpError && e.status === 401,
      );
      const token = await login(email, password),
        admin = await getSession(token);
      assert.ok(admin);
      assert.equal(admin.role, "super_admin");
      const { id: teamId } = await createTeam(admin, {
        name: "Test Staff",
        email: teamEmail,
        password,
      });
      ids.push(teamId);
      await assert.rejects(
        () =>
          createTeam(admin, { name: "Test Staff", email: teamEmail, password }),
        (e: unknown) => e instanceof HttpError && e.status === 409,
      );
      await assert.rejects(
        () =>
          createTeam(admin, {
            name: "Bad Role",
            email: "bad-" + tag + "@example.test",
            password,
            role: "super_admin",
          }),
        HttpError,
      );
      const teamToken = await login(teamEmail, password),
        team = await getSession(teamToken);
      assert.ok(team);
      await assert.rejects(
        () => listTeam(team),
        (e: unknown) => e instanceof HttpError && e.status === 403,
      );
      await assert.rejects(
        () => changeTeam(admin, admin.id, { action: "deactivate" }),
        HttpError,
      );
      await changeTeam(admin, teamId, { action: "deactivate" });
      assert.equal(await getSession(teamToken), null);
      await assert.rejects(() => login(teamEmail, password), HttpError);
      await changeTeam(admin, teamId, { action: "activate" });
      const activeToken = await login(teamEmail, password);
      await changeTeam(admin, teamId, {
        action: "reset_password",
        password: password + "-new",
      });
      assert.equal(await getSession(activeToken), null);
      const newToken = await login(teamEmail, password + "-new"),
        newTeam = await getSession(newToken);
      assert.ok(newTeam);
      await changeOwnPassword(
        newTeam,
        password + "-new",
        password + "-changed",
      );
      assert.equal(await getSession(newToken), null);
      const finalToken = await login(teamEmail, password + "-changed"),
        finalTeam = await getSession(finalToken);
      assert.ok(finalTeam);
      await logout(finalTeam);
      assert.equal(await getSession(finalToken), null);
      const data = await listTeam(admin);
      assert.ok(data.events.some((e) => e.action === "team_deactivate"));
      assert.ok(data.users.some((u) => u.id === teamId));
      assert.ok(!JSON.stringify(data).includes("password_hash"));
      const stored = await rows<{ token_hash: string }>(
        "SELECT token_hash FROM sessions WHERE user_id=?",
        [id],
      );
      assert.ok(stored.every((s) => s.token_hash !== token));
      const rateEmail = "rate-" + tag;
      for (let i = 0; i < 8; i++) await limitLogin(rateEmail);
      await assert.rejects(
        () => limitLogin(rateEmail),
        (e: unknown) => e instanceof HttpError && e.status === 429,
      );
    } finally {
      for (const uid of ids.reverse()) {
        await write(
          "DELETE FROM security_events WHERE actor_id=? OR target_id=?",
          [uid, uid],
        );
        await write("DELETE FROM sessions WHERE user_id=?", [uid]);
        await write("DELETE FROM users WHERE id=?", [uid]);
      }
      await closeDb();
    }
  },
);
