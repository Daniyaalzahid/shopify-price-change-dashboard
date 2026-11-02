import { NextResponse } from "next/server";
import { endpoint, mutation, authorized } from "@/server/http";
import { jsonBody } from "@/server/security";
import { createTeam, listTeam } from "@/server/accounts";
export async function GET() {
  return endpoint(async () =>
    NextResponse.json(await listTeam(await authorized(true))),
  );
}
export async function POST(request: Request) {
  return endpoint(async () => {
    mutation(request);
    const actor = await authorized(true);
    return NextResponse.json(await createTeam(actor, await jsonBody(request)), {
      status: 201,
    });
  });
}
