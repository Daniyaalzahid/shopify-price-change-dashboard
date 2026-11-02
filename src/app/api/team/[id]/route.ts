import { NextResponse } from "next/server";
import { endpoint, mutation, authorized } from "@/server/http";
import { jsonBody } from "@/server/security";
import { changeTeam } from "@/server/accounts";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    mutation(request);
    const actor = await authorized(true);
    const { id } = await params;
    await changeTeam(actor, id, await jsonBody(request));
    return NextResponse.json({ ok: true });
  });
}
