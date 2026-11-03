import { NextResponse } from "next/server";
import { authorized, endpoint, mutation } from "@/server/http";
import { catalogPage } from "@/server/shopify";
import { HttpError } from "@/server/security";

export function POST(request: Request) {
  return endpoint(async () => {
    mutation(request);
    await authorized();
    const cursor = new URL(request.url).searchParams.get("after");
    if (cursor && cursor.length > 2048) throw new HttpError(400, "Invalid catalog cursor.");
    return NextResponse.json(await catalogPage(cursor));
  });
}
