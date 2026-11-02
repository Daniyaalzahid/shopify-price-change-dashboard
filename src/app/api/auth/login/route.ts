import { NextResponse } from "next/server";
import { endpoint, mutation } from "@/server/http";
import { jsonBody, cookieSettings } from "@/server/security";
import { login } from "@/server/accounts";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return endpoint(async () => {
    mutation(request);
    const body = await jsonBody(request);
    const token = await login(body.email, body.password);
    const response = NextResponse.json({ ok: true });
    const { name, ...options } = cookieSettings();
    response.cookies.set(name, token, { ...options, maxAge: 12 * 60 * 60 });
    return response;
  });
}
