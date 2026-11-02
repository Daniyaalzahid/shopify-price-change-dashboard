import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}
export function normalizedEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 190 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}
export function validName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= 2 &&
    value.trim().length <= 100
  );
}
function derive(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (e, key) => (e ? reject(e) : resolve(key)),
    ),
  );
}
export async function hashPassword(password: string) {
  if (!validPassword(password))
    throw new HttpError(400, "Use a password of 12–128 characters.");
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return `scrypt-v1$${salt}$${key.toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [version, salt, key] = hash.split("$");
  if (
    version !== "scrypt-v1" ||
    !/^[a-f0-9]{32}$/.test(salt || "") ||
    !/^[a-f0-9]{128}$/.test(key || "")
  )
    return false;
  const calculated = await derive(password, salt);
  return timingSafeEqual(calculated, Buffer.from(key, "hex"));
}
// Fixed valid hash used to perform equivalent KDF work for unknown accounts.
export const DUMMY_HASH =
  "scrypt-v1$00000000000000000000000000000000$" + "00".repeat(64);
export function appOrigin() {
  const configured = process.env.APP_ORIGIN;
  if (!configured)
    throw new HttpError(503, "Workspace configuration is incomplete.");
  const url = new URL(configured);
  if (url.origin !== configured || url.username || url.password)
    throw new HttpError(503, "Workspace configuration is incomplete.");
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
  )
    throw new HttpError(503, "HTTPS is required.");
  return url.origin;
}
export function cookieSettings() {
  const secure = appOrigin().startsWith("https:");
  return {
    name: secure ? "__Host-pricedesk_session" : "pricedesk_dev_session",
    secure,
    httpOnly: true,
    sameSite: "strict" as const,
    path: "/",
  };
}
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== appOrigin())
    throw new HttpError(403, "Request origin is not allowed.");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new HttpError(403, "Request origin is not allowed.");
}
export async function jsonBody(request: Request) {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new HttpError(415, "Expected JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Missing request body.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 8192) {
        await reader.cancel();
        throw new HttpError(413, "Request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString());
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
