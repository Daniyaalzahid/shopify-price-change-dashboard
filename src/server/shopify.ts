import { HttpError } from "./security";
import type { Product } from "../lib/products";

type Page<T> = { nodes: T[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
type Collection = { title: string };
type Variant = {
  id: string; title: string; sku: string | null; price: string; compareAtPrice: string | null;
  product: { id: string; title: string; vendor: string; status: string;
    featuredImage: {url: string} | null; collections: Page<Collection> };
};

let cached: {domain: string; token: string; expires: number} | undefined;
const pageFields = "pageInfo { hasNextPage endCursor }";
const query = `query Catalog($after: String) {
  shop { currencyCode }
  productVariants(first: 50, after: $after) {
    nodes { id title sku price compareAtPrice product { id title vendor status
      featuredImage { url } collections(first: 8) { nodes { title } ${pageFields} }
    } } ${pageFields}
  }
}`;

export async function catalogPage(after: string | null) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.trim().toLowerCase();
  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();
  const secret = process.env.SHOPIFY_CLIENT_SECRET?.trim();
  if (!domain || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain) || !clientId || !secret)
    throw new HttpError(503, "Check SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in Hostinger.");
  if (!cached || cached.domain !== domain || cached.expires <= Date.now()) {
    const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15000),
      body: new URLSearchParams({grant_type: "client_credentials", client_id: clientId, client_secret: secret}),
    });
    if (!res.ok) throw new HttpError(502, "Shopify login failed. Verify the app is installed on this store and check its credentials.");
    const auth = await res.json();
    if (!auth.access_token) throw new HttpError(502, "Shopify returned no access token.");
    cached = { domain, token: auth.access_token, expires: Date.now() + (Number(auth.expires_in) - 90) * 1000 };
  }
  const token = cached.token;
  async function read<T>(document: string, variables: Record<string, string | null>): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(`https://${domain}/admin/api/2026-10/graphql.json`, {
        method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(20000),
        headers: {"Content-Type": "application/json", "X-Shopify-Access-Token": token},
        body: JSON.stringify({query: document, variables}),
      });
      if (res.status === 401) cached = undefined;
      const body = res.ok ? await res.json() : {};
      const codes = body.errors?.map((error: {extensions?: {code?: string}}) => error.extensions?.code) ?? [];
      if (res.status === 429 || codes.includes("THROTTLED")) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      if (res.status === 403 || codes.includes("ACCESS_DENIED"))
        throw new HttpError(502, "Approve product read access for the installed Shopify app.");
      if (!res.ok || body.errors?.length || !body.data)
        throw new HttpError(502, "Shopify could not return this catalog page. Retry sync.");
      return body.data;
    }
    throw new HttpError(429, "Shopify is busy. Retry sync shortly.");
  }
  const data = await read<{shop: {currencyCode: string}; productVariants: Page<Variant>}>(query, {after});
  const products: Product[] = [];
  const memberships = new Map<string, string[]>();
  for (const item of data.productVariants.nodes) {
    const p = item.product;
    let collections = memberships.get(p.id);
    if (!collections) {
      let group = p.collections;
      collections = group.nodes.map(c => c.title);
      while (group.pageInfo.hasNextPage) {
        const cursor = group.pageInfo.endCursor;
        if (!cursor) throw new HttpError(502, "Shopify returned an incomplete collection page.");
        const extra = await read<{product: {collections: Page<Collection>}}>(
          `query Memberships($id: ID!, $after: String!) { product(id: $id) { collections(first: 250, after: $after) { nodes { title } ${pageFields} } } }`,
          {id: p.id, after: cursor});
        group = extra.product.collections;
        collections.push(...group.nodes.map(c => c.title));
      }
      memberships.set(p.id, collections);
    }
    products.push({id: item.id, name: p.title, variant: item.title, sku: item.sku ?? "",
      price: Number(item.price), compareAt: item.compareAtPrice === null ? null : Number(item.compareAtPrice),
      status: p.status[0] + p.status.slice(1).toLowerCase(), brand: p.vendor,
      collection: collections.join(", "), collections, image: p.featuredImage?.url, kind: "small"});
  }
  const info = data.productVariants.pageInfo;
  if (info.hasNextPage && !info.endCursor) throw new HttpError(502, "Shopify returned an incomplete variant page.");
  return {products, currency: data.shop.currencyCode, next: info.hasNextPage ? info.endCursor : null};
}
