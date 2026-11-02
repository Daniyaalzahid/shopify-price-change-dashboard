import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hashPassword,
  verifyPassword,
  validPassword,
  normalizedEmail,
  sameOrigin,
  jsonBody,
  HttpError,
  digest,
  newToken,
} from "../src/server/security";
import { sessionAlive } from "../src/server/accounts";
test("password hashes use random salts and verify without storing plaintext", async () => {
  const password = "test-only-password-234";
  const a = await hashPassword(password),
    b = await hashPassword(password);
  assert.notEqual(a, b);
  assert.ok(!a.includes(password));
  assert.equal(await verifyPassword(password, a), true);
  assert.equal(await verifyPassword("incorrect", a), false);
  assert.equal(await verifyPassword(password, "broken"), false);
  assert.equal(validPassword("short"), false);
});
test("email, tokens and session boundaries are validated", () => {
  assert.equal(normalizedEmail(" USER@Example.com "), "user@example.com");
  assert.equal(normalizedEmail("broken"), null);
  const token = newToken();
  assert.equal(token.length, 43);
  assert.notEqual(token, digest(token));
  const now = 100000000;
  const s = {
    last_seen: now - 1000,
    expires_at: now + 1000,
    active: 1,
    auth_version: 1,
    session_version: 1,
  };
  assert.equal(sessionAlive(s, now), true);
  assert.equal(sessionAlive({ ...s, active: 0 }, now), false);
  assert.equal(sessionAlive({ ...s, session_version: 2 }, now), false);
  assert.equal(sessionAlive({ ...s, expires_at: now }, now), false);
  assert.equal(sessionAlive({ ...s, last_seen: now - 7200000 }, now), false);
});
test("mutations require the configured exact origin, and JSON is bounded", async () => {
  const previous = process.env.APP_ORIGIN;
  process.env.APP_ORIGIN = "https://desk.example.com";
  try {
    assert.throws(
      () =>
        sameOrigin(
          new Request("https://desk.example.com/api/team", {
            method: "POST",
            headers: { origin: "https://evil.example.com" },
          }),
        ),
      HttpError,
    );
    assert.throws(
      () =>
        sameOrigin(
          new Request("https://desk.example.com/api/team", { method: "POST" }),
        ),
      HttpError,
    );
    assert.doesNotThrow(() =>
      sameOrigin(
        new Request("https://desk.example.com/api/team", {
          method: "POST",
          headers: { origin: "https://desk.example.com" },
        }),
      ),
    );
    await assert.rejects(
      () =>
        jsonBody(
          new Request("https://desk.example.com", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "x".repeat(9000),
          }),
        ),
      (e: unknown) => e instanceof HttpError && e.status === 413,
    );
    await assert.rejects(
      () =>
        jsonBody(
          new Request("https://desk.example.com", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "[]",
          }),
        ),
      HttpError,
    );
  } finally {
    if (previous === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previous;
  }
});
