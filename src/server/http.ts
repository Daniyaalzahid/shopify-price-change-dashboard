import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession, type Session } from "./accounts";
import { HttpError, cookieSettings, sameOrigin } from "./security";
export function demoMode() {
  return process.env.APP_MODE === "demo";
}
export async function currentSession() {
  if (demoMode()) return null;
  return getSession((await cookies()).get(cookieSettings().name)?.value);
}
export async function authorized(admin = false): Promise<Session> {
  if (demoMode())
    throw new HttpError(
      503,
      "Account operations are unavailable in demo mode.",
    );
  const actor = await currentSession();
  if (!actor) throw new HttpError(401, "Please sign in.");
  if (admin && actor.role !== "super_admin")
    throw new HttpError(403, "Super Admin access is required.");
  return actor;
}
export async function endpoint(fn: () => Promise<NextResponse>) {
  try {
    const response = await fn();
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (e) {
    const known = e instanceof HttpError;
    if (!known)
      console.error(
        "Workspace request failed:",
        (e as { code?: string }).code ?? "INTERNAL_ERROR",
      );
    return NextResponse.json(
      {
        error: known
          ? e.message
          : "Service unavailable. Check the database and workspace configuration.",
      },
      {
        status: known ? e.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
export function mutation(request: Request) {
  if (demoMode())
    throw new HttpError(
      503,
      "Account operations are unavailable in demo mode.",
    );
  sameOrigin(request);
}
export function clearSession(response: NextResponse) {
  const { name, ...options } = cookieSettings();
  response.cookies.set(name, "", { ...options, maxAge: 0 });
  return response;
}
