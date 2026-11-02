import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, cp, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
test("packaged CLI starts without source files, tsx or node_modules", async () => {
  const target = resolve(".next/standalone");
  const isolated = await mkdtemp(join(tmpdir(), "pricedesk-cli-"));
  try {
    await cp(join(target, "scripts"), join(isolated, "scripts"), {
      recursive: true,
    });
    await cp(join(target, "migrations"), join(isolated, "migrations"), {
      recursive: true,
    });
    await access(join(isolated, "migrations/001_accounts.sql"));
    // No operation is allowed to run; this only verifies standalone dependency resolution.
    const result = spawnSync(
      process.execPath,
      [join(isolated, "scripts/manage.cjs"), "help"],
      { cwd: isolated, env: { PATH: process.env.PATH }, encoding: "utf8" },
    );
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /Use migrate, bootstrap, recover-admin or cleanup/,
    );
    assert.doesNotMatch(
      result.stderr,
      /Cannot find module|MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND/,
    );
  } finally {
    await rm(isolated, { recursive: true, force: true });
  }
});
