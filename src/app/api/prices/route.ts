import { NextResponse } from "next/server";
import { authorized, endpoint, mutation } from "@/server/http";
import { HttpError, jsonBody } from "@/server/security";
import { db, rows, write } from "@/server/db";
import { pricingClient } from "@/server/shopify";
import { priceError } from "@/lib/products";

export function POST(request: Request) {
  return endpoint(async () => {
    mutation(request);
    const actor = await authorized();
    const {id, expected, price} = await jsonBody(request);
    if (typeof id !== "string" || !/^gid:\/\/shopify\/ProductVariant\/[0-9]{1,20}$/.test(id) ||
        typeof expected !== "number" || !Number.isFinite(expected) || expected < 0 ||
        typeof price !== "string" || !price.trim() || priceError(price) || Number(price) === expected)
      throw new HttpError(400, "Invalid variant or price.");
    const api = await pricingClient();
    const conn = await db().getConnection();
    const lock = "pricedesk:" + id.split("/").pop();
    let locked = false;
    try {
      const [row] = await rows<{ok:number}>("SELECT GET_LOCK(?,0) ok", [lock], conn);
      locked = row.ok === 1;
      if (!locked) throw new HttpError(409, "Another update is in progress for this variant.");
      const variant = await api.variant(id);
      const conflict = Number(variant.price) !== expected;
      const result = await write(
        "INSERT INTO price_updates(actor_id,actor_name,variant_id,product_name,sku,old_price,new_price,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
        [actor.id, actor.name, id, variant.product.title, variant.sku ?? "", variant.price, price.trim(),
          conflict ? "Conflict" : "Unconfirmed", Date.now()], conn);
      if (conflict) throw new HttpError(409, "Shopify price changed since review. Sync and review this variant again.");
      try {
        await api.setPrice(variant.product.id, id, price.trim());
      } catch (error) {
        const rejected = error instanceof HttpError && [403,422,429].includes(error.status);
        const detail = error instanceof HttpError ? error.message : "Check the live price before retrying.";
        await write("UPDATE price_updates SET status=?,detail=? WHERE id=?",
          [rejected ? "Rejected" : "Unconfirmed", detail, result.insertId], conn);
        throw error;
      }
      await write("UPDATE price_updates SET status='Updated' WHERE id=?", [result.insertId], conn);
      return NextResponse.json({price:Number(price)});
    } finally {
      try {
        if (locked) await conn.query("SELECT RELEASE_LOCK(?)", [lock]);
      } finally { conn.release(); }
    }
  });
}

export function GET(request: Request) {
  return endpoint(async () => {
    const actor = await authorized();
    const cursor = new URL(request.url).searchParams.get("before");
    if (cursor && !/^\d{1,19}$/.test(cursor)) throw new HttpError(400, "Invalid history cursor.");
    const clauses: string[] = [];
    const params: string[] = [];
    if (cursor) { clauses.push("id < ?"); params.push(cursor); }
    if (actor.role !== "super_admin") { clauses.push("actor_id = ?"); params.push(actor.id); }
    const where = clauses.length ? " WHERE " + clauses.join(" AND ") : "";
    return NextResponse.json(await rows(
      "SELECT id,actor_name,product_name,sku,variant_id,old_price,new_price,status,detail,created_at FROM price_updates" +
      where + " ORDER BY id DESC LIMIT 50", params));
  });
}
