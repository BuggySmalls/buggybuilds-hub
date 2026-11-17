// BetterBettor+ passcode books (Nick, Nov 17 2026).
// Each passcode opens its own book. The browser sends sha256("betterbettor:" + passcode) as X-Book,
// never the passcode itself; that hash names one Durable Object holding { v, data, updatedAt }.
// GET  /betterbettor/api/book            -> 200 { v, data, updatedAt } | 404 { exists: false }
// PUT  /betterbettor/api/book { v, data, create? }
//      -> 200 { v, updatedAt } | 409 { v, data, updatedAt } (someone saved first) | 404 (no book and no create)
// Saves carry the version they were based on, so a phone and a laptop never silently overwrite each other.
import { DurableObject } from "cloudflare:workers";

const MAX_BYTES = 1_000_000;
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

export async function handleBetterBettor(req, env, url) {
  if (url.pathname !== "/betterbettor/api/book") return json({ error: "not found" }, 404);
  const key = (req.headers.get("X-Book") || "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(key)) return json({ error: "bad book key" }, 400);
  if (req.method !== "GET" && req.method !== "PUT") return json({ error: "method" }, 405);
  if (req.method === "PUT") {
    const len = +(req.headers.get("Content-Length") || 0);
    if (len > MAX_BYTES) return json({ error: "too big" }, 413);
  }
  const stub = env.BOOK.get(env.BOOK.idFromName(key));
  const res = await stub.fetch(new Request("https://book/", { method: req.method, body: req.method === "PUT" ? await req.text() : null }));
  if (res.status === 404) await new Promise((r) => setTimeout(r, 300)); // slow down passcode guessing
  return res;
}

export class Book extends DurableObject {
  async fetch(req) {
    const cur = (await this.ctx.storage.get("b")) || null;
    if (req.method === "GET") return cur ? json(cur) : json({ exists: false }, 404);
    let body;
    try {
      const text = await req.text();
      if (text.length > MAX_BYTES) return json({ error: "too big" }, 413);
      body = JSON.parse(text);
    } catch { return json({ error: "bad json" }, 400); }
    const data = body && body.data;
    if (!data || typeof data !== "object" || !Array.isArray(data.events)) return json({ error: "bad data" }, 400);
    if (!cur && !body.create) return json({ exists: false }, 404);
    if (cur && body.v !== cur.v) return json(cur, 409);
    const next = { v: (cur ? cur.v : 0) + 1, data, updatedAt: Date.now() };
    await this.ctx.storage.put("b", next);
    return json({ v: next.v, updatedAt: next.updatedAt });
  }
}
