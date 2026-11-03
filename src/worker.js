// buggybuilds.org Worker.
// Everything in ./public is served as static assets. The only server code is the
// Breaker voice relay: /breaker/ws/<CHANNEL> upgrades to a WebSocket handled by one
// Durable Object per channel. It is full duplex: anyone can talk at any time, and each
// audio frame is forwarded to everyone else tagged with the sender's slot number.
// Audio is never stored; it is forwarded and forgotten.
import { DurableObject } from "cloudflare:workers";

const MAX_PEOPLE = 12;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/breaker\/ws\/([A-Za-z0-9-]{1,24})$/);
    if (m) {
      if (req.headers.get("Upgrade") !== "websocket") return new Response("Expected a WebSocket", { status: 426 });
      const stub = env.CHANNEL.get(env.CHANNEL.idFromName(m[1].toUpperCase()));
      return stub.fetch(req);
    }
    return env.ASSETS.fetch(req);
  },
};

export class Channel extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // Keepalive pings are answered without waking the object.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async fetch(req) {
    const url = new URL(req.url);
    const name = (url.searchParams.get("name") || "Someone").replace(/\s+/g, " ").trim().slice(0, 16) || "Someone";
    const cid = (url.searchParams.get("cid") || "").slice(0, 40);
    const taken = new Set(this.people().map((w) => this.info(w).slot));
    let slot = 0;
    while (taken.has(slot) && slot < 255) slot++;
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ slot, name, cid, muted: false, mode: "open" });
    return new Response(null, { status: 101, webSocket: client });
  }

  people(except) {
    return this.ctx.getWebSockets().filter((w) => w !== except && w.readyState === WebSocket.OPEN);
  }
  info(ws) {
    try { return ws.deserializeAttachment() || {}; } catch { return {}; }
  }
  send(ws, obj) {
    try { ws.send(JSON.stringify(obj)); } catch {}
  }
  roster(except) {
    const people = this.people(except).map((w) => { const a = this.info(w); return { slot: a.slot, name: a.name, muted: !!a.muted, mode: a.mode }; });
    const s = JSON.stringify({ t: "roster", people });
    for (const w of this.people(except)) { try { w.send(s); } catch {} }
  }

  async webSocketMessage(ws, msg) {
    const me = this.info(ws);
    if (typeof msg !== "string") {
      // Audio frame: prefix the sender's slot and pass it to everyone else.
      const body = new Uint8Array(msg);
      if (body.length === 0 || body.length > 4000) return;
      const out = new Uint8Array(body.length + 1);
      out[0] = me.slot;
      out.set(body, 1);
      for (const w of this.people(ws)) { try { w.send(out); } catch {} }
      return;
    }
    let m;
    try { m = JSON.parse(msg); } catch { return; }

    if (m.t === "hello") {
      // Same phone reconnecting: drop its old, half-dead socket.
      if (me.cid) for (const w of this.people(ws)) {
        if (this.info(w).cid === me.cid) { try { w.close(4000, "replaced"); } catch {} }
      }
      const others = this.people(ws).filter((w) => !me.cid || this.info(w).cid !== me.cid);
      if (others.length >= MAX_PEOPLE) {
        this.send(ws, { t: "full", max: MAX_PEOPLE });
        try { ws.close(4001, "full"); } catch {}
        return;
      }
      me.muted = !!m.muted;
      me.mode = m.mode === "push" ? "push" : "open";
      ws.serializeAttachment(me);
      this.send(ws, { t: "you", slot: me.slot });
      this.roster();
      return;
    }

    if (m.t === "state") {
      me.muted = !!m.muted;
      me.mode = m.mode === "push" ? "push" : "open";
      ws.serializeAttachment(me);
      this.roster();
    }
  }

  async webSocketClose(ws, code) {
    this.roster(ws);
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, "bye"); } catch {}
  }
  async webSocketError(ws) {
    this.roster(ws);
  }
}
