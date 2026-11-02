import { NextResponse } from "next/server";
import { endpoint, mutation, authorized, clearSession } from "@/server/http";
import { logout } from "@/server/accounts";
export async function POST(request: Request) {
  return endpoint(async () => {
    mutation(request);
    const actor = await authorized();
    await logout(actor);
    return clearSession(NextResponse.json({ ok: true }));
  });
}
