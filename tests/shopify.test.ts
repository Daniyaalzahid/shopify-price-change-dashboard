import test from "node:test";
import assert from "node:assert/strict";
import { catalogPage } from "../src/server/shopify";

test("catalog exchanges private credentials and reads every collection for a variant", async (t) => {
  process.env.SHOPIFY_STORE_DOMAIN = "example.myshopify.com";
  process.env.SHOPIFY_CLIENT_ID = "test-client";
  process.env.SHOPIFY_CLIENT_SECRET = "test-secret";
  const responses = [
    {access_token: "test-token", expires_in: 86400},
    {data: { shop: {currencyCode: "PKR"}, productVariants: {
      nodes: [{id:"variant-1", title:"Black", sku:"SKU", price:"12.50", compareAtPrice:null,
        product:{id:"product-1", title:"Kettle", vendor:"Brand", status:"ACTIVE", featuredImage:null,
          collections:{nodes:[{title:"Kitchen"}],pageInfo:{hasNextPage:true,endCursor:"more"}}}}],
      pageInfo:{hasNextPage:true,endCursor:"next-page"}}}},
    {data:{product:{collections:{nodes:[{title:"Sale"}],pageInfo:{hasNextPage:false,endCursor:null}}}}},
  ];
  const calls = t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(new URL(url).hostname, "example.myshopify.com");
    if (url.endsWith("/graphql.json")) {
      assert.equal(new Headers(init.headers).get("X-Shopify-Access-Token"), "test-token");
      assert.ok(!String(init.body).includes("test-secret"));
    }
    return Response.json(responses.shift());
  });
  const page = await catalogPage(null);
  assert.equal(calls.mock.callCount(), 3);
  assert.equal(page.next, "next-page");
  assert.equal(page.products[0].price, 12.5);
  assert.equal(page.products[0].compareAt, null);
  assert.deepEqual(page.products[0].collections, ["Kitchen","Sale"]);
  process.env.SHOPIFY_STORE_DOMAIN = "example.myshopify.com.other.test";
  await assert.rejects(catalogPage(null), /SHOPIFY_STORE_DOMAIN/);
  assert.equal(calls.mock.callCount(), 3);
});
