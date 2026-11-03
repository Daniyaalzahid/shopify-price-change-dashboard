"use client";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

type Entry = {id:number;actor_name:string;product_name:string;sku:string;variant_id:string;
  old_price:string;new_price:string;status:string;detail:string;created_at:number};

export function PriceHistory({compact = false}: {compact?: boolean}) {
  const [entries,setEntries] = useState<Entry[]>([]);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(true);
  const [more,setMore] = useState(false);
  const [before,setBefore] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setBusy(true);
      setError("");
      try {
        const res = await fetch(before ? "/api/prices?before=" + before : "/api/prices", {signal:controller.signal});
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setEntries(previous => before ? [...previous,...data] : data);
        setMore(data.length === 50);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "History unavailable.");
      } finally { if (!controller.signal.aborted) setBusy(false); }
    }
    void load();
    return () => controller.abort();
  }, [before]);
  return <div aria-live="polite">
    {error && <p>{error}</p>}
    {busy && <p>Loading price history…</p>}
    {!busy && !error && !entries.length && <p>No price updates yet.</p>}
    {(compact ? entries.slice(0,3) : entries).map(entry => <div key={entry.id} className="stat-card">
      <strong>{entry.product_name} · {entry.sku || entry.variant_id}</strong>
      <p>{entry.actor_name} · {new Date(Number(entry.created_at)).toLocaleString()}</p>
      <p>{Number(entry.old_price)} → {Number(entry.new_price)} · {entry.status}</p>
      {entry.detail && <p>{entry.detail}</p>}
    </div>)}
    {!compact && more && <Button disabled={busy} onClick={() => setBefore(entries[entries.length-1].id)}>Older updates</Button>}
  </div>;
}
