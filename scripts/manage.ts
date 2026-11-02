import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { db, rows, write, closeDb } from "../src/server/db";
import {
  digest,
  hashPassword,
  normalizedEmail,
  validName,
} from "../src/server/security";
async function migrate() {
  const c = await db().getConnection();
  try {
    const [lock] = await rows<{ acquired: number }>(
      "SELECT GET_LOCK(?,10) AS acquired",
      ["pricedesk_migrations"],
      c,
    );
    if (lock.acquired !== 1) throw new Error("Migration lock unavailable.");
    await write(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(190) PRIMARY KEY,checksum CHAR(64) NOT NULL,applied_at BIGINT NOT NULL)",
      [],
      c,
    );
    for (const name of (
      await readdir(new URL("../migrations/", import.meta.url))
    )
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      const sql = await readFile(
        new URL("../migrations/" + name, import.meta.url),
        "utf8",
      );
      const checksum = digest(sql);
      const [existing] = await rows<{ checksum: string }>(
        "SELECT checksum FROM schema_migrations WHERE name=?",
        [name],
        c,
      );
      if (existing) {
        if (existing.checksum !== checksum)
          throw new Error("Applied migration checksum mismatch.");
        continue;
      }
      for (const statement of sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean))
        await c.query(statement);
      await write(
        "INSERT INTO schema_migrations(name,checksum,applied_at) VALUES(?,?,?)",
        [name, checksum, Date.now()],
        c,
      );
      console.log("Applied migration:", name);
    }
  } finally {
    await c.query("SELECT RELEASE_LOCK(?)", ["pricedesk_migrations"]);
    c.release();
  }
}
async function bootstrap(reset = false) {
  const email = normalizedEmail(process.env.BOOTSTRAP_EMAIL),
    name = process.env.BOOTSTRAP_NAME,
    password = process.env.BOOTSTRAP_PASSWORD;
  if (!email || (!reset && !validName(name)) || !password)
    throw new Error(
      "Set BOOTSTRAP_EMAIL, BOOTSTRAP_NAME and BOOTSTRAP_PASSWORD securely in your environment.",
    );
  const hash = await hashPassword(password);
  delete process.env.BOOTSTRAP_PASSWORD;
  const c = await db().getConnection();
  try {
    const [lock] = await rows<{ acquired: number }>(
      "SELECT GET_LOCK(?,10) AS acquired",
      ["pricedesk_bootstrap"],
      c,
    );
    if (lock.acquired !== 1) throw new Error("Bootstrap lock unavailable.");
    await c.beginTransaction();
    const admins = await rows<{ id: string; email: string }>(
      "SELECT id,email FROM users WHERE role=? FOR UPDATE",
      ["super_admin"],
      c,
    );
    if (reset) {
      const admin = admins.find((a) => a.email === email);
      if (!admin) throw new Error("Matching Super Admin not found.");
      await write(
        "UPDATE users SET password_hash=?,active=1,auth_version=auth_version+1 WHERE id=?",
        [hash, admin.id],
        c,
      );
      await write("DELETE FROM sessions WHERE user_id=?", [admin.id], c);
      await write(
        "INSERT INTO security_events(actor_id,target_id,action,created_at) VALUES(NULL,?,?,?)",
        [admin.id, "admin_recovered_cli", Date.now()],
        c,
      );
    } else {
      if (admins.length) throw new Error("Super Admin already exists.");
      const id = randomUUID();
      await write(
        "INSERT INTO users(id,name,email,password_hash,role,created_at) VALUES(?,?,?,?,?,?)",
        [id, name!.trim(), email, hash, "super_admin", Date.now()],
        c,
      );
      await write(
        "INSERT INTO security_events(actor_id,target_id,action,created_at) VALUES(NULL,?,?,?)",
        [id, "admin_bootstrapped", Date.now()],
        c,
      );
    }
    await c.commit();
    console.log(
      reset
        ? "Super Admin password reset; existing sessions revoked."
        : "Super Admin created.",
    );
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    await c.query("SELECT RELEASE_LOCK(?)", ["pricedesk_bootstrap"]);
    c.release();
  }
}
async function main() {
  switch (process.argv[2]) {
    case "migrate":
      await migrate();
      break;
    case "bootstrap":
      await bootstrap();
      break;
    case "recover-admin":
      await bootstrap(true);
      break;
    case "cleanup":
      await write("DELETE FROM sessions WHERE expires_at<=? OR last_seen<=?", [
        Date.now(),
        Date.now() - 2 * 60 * 60 * 1000,
      ]);
      await write("DELETE FROM login_limits WHERE window_end<=?", [Date.now()]);
      console.log("Expired sessions and login limits removed.");
      break;
    default:
      throw new Error("Use migrate, bootstrap, recover-admin or cleanup.");
  }
}
main()
  .catch((e) => {
    console.error(
      "Management task failed:",
      (e as { code?: string }).code ??
        (e instanceof Error && !/sql|query|access denied/i.test(e.message)
          ? e.message
          : "Check server configuration."),
    );
    process.exitCode = 1;
  })
  .finally(closeDb);
