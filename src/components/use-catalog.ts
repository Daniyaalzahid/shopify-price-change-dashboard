"use client";
import { useEffect, useState } from "react";
import { products as samples, type Product } from "@/lib/products";

export function useCatalog(live: boolean) {
  const [products, setProducts] = useState<Product[]>(live ? [] : samples);
  const [currency, setCurrency] = useState(live ? "" : "PKR");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(live);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!live) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setConnected(false);
      setMessage("Contacting Shopify…");
      const items = new Map<string, Product>();
      const cursors = new Set<string>();
      let next: string | null = null;
      try {
        do {
          const url: string = "/api/catalog" + (next ? "?after=" + encodeURIComponent(next) : "");
          const response = await fetch(url, {method: "POST", signal: controller.signal});
          const page = await response.json();
          if (!response.ok) throw new Error(page.error || "Catalog request failed.");
          for (const p of page.products as Product[]) items.set(p.id, p);
          next = page.next;
          if (next && cursors.has(next)) throw new Error("Shopify repeated a page. Retry sync.");
          if (next) cursors.add(next);
          setMessage(`Read ${items.size} variants…`);
          if (!next) setCurrency(page.currency);
        } while (next);
        setProducts([...items.values()]);
        setConnected(true);
        setMessage(`Synced ${items.size} variants at ${new Date().toLocaleTimeString()}.`);
      } catch (error) {
        if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Sync failed.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [live, revision]);
  return {products, currency, loading, connected, message, sync: () => setRevision(n => n + 1)};
}
