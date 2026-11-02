import { NextResponse } from "next/server";
import { endpoint, mutation, authorized, clearSession } from "@/server/http";
import { jsonBody } from "@/server/security";
import { changeOwnPassword, limitLogin } from "@/server/accounts";
export async function POST(request: Request) {
  return endpoint(async () => {
    mutation(request);
    const actor = await authorized();
    await limitLogin("password-change:" + actor.id);
    const body = await jsonBody(request);
    await changeOwnPassword(actor, body.currentPassword, body.password);
    return clearSession(NextResponse.json({ ok: true }));
  });
}
