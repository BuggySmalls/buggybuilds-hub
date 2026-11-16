// Wiki Race server. Two Durable Objects:
//  - Daily: one object ("board") holding every day's leaderboard. One attempt per name per day.
//    Players' paths (and the shortest route) only go to someone who has finished or given up that day's race themselves.
//  - Race: one object per room code for head-to-head (2 players) and group races (up to 16).
//    Everyone's progress is logged here silently and only revealed on the results screen,
//    which unlocks when every racer has finished or given up (or the host ends the race).
//    Routes only go to people who raced that round; anyone who joined late to watch sees times only.
// Article pages themselves are fetched by the browser straight from Wikipedia.
import { DurableObject } from "cloudflare:workers";
import { PAIRS, FIRST_DAY } from "./wikirace-pairs.js";

const TZ = "America/New_York";
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const dayNum = (date) => Math.round((Date.parse(date + "T12:00:00Z") - Date.parse(FIRST_DAY + "T12:00:00Z")) / 864e5) + 1;
export function dailyPair(date) {
  const n = dayNum(date);
  const i = (((n - 1) % PAIRS.length) + PAIRS.length) % PAIRS.length;
  return { n, start: PAIRS[i][0], target: PAIRS[i][1] };
}
const addDays = (date, k) => new Date(Date.parse(date + "T12:00:00Z") + k * 864e5).toISOString().slice(0, 10);
const cleanName = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 16);
const keyOf = (s) => cleanName(s).toLowerCase();
const cleanTitle = (s) => String(s || "").replace(/_/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
function cleanPath(p) {
  if (!Array.isArray(p)) return [];
  return p.slice(0, 400).map((s) => ({ t: cleanTitle(s && s.t), at: Math.max(0, Math.round(+(s && s.at) || 0)) })).filter((s) => s.t);
}
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function handleWikiRace(req, env, url) {
  if (url.pathname.startsWith("/wikirace/api/")) {
    return env.DAILY.get(env.DAILY.idFromName("board")).fetch(req);
  }
  const m = url.pathname.match(/^\/wikirace\/ws\/([A-Za-z]{4})$/);
  if (m) {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("Expected a WebSocket", { status: 426 });
    return env.RACE.get(env.RACE.idFromName(m[1].toUpperCase())).fetch(req);
  }
  return null;
}

// ---------------------------------------------------------------- Daily
export class Daily extends DurableObject {
  async day(date) {
    return (await this.ctx.storage.get("d:" + date)) || { entries: {}, shortest: null };
  }
  async streaks(names, upTo) {
    const out = {};
    for (const k of names) {
      const dates = new Set((await this.ctx.storage.get("n:" + k)) || []);
      let s = 0, d = upTo;
      while (dates.has(d)) { s++; d = addDays(d, -1); }
      out[k] = s;
    }
    return out;
  }
  async board(date, token) {
    const t = today();
    const data = await this.day(date);
    const now = Date.now();
    const list = Object.entries(data.entries).map(([k, e]) => {
      let status = e.status;
      if (status === "playing" && now - e.startedAt > 2 * 3600e3) status = "dnf";
      if (status === "playing" && date < t) status = "dnf";
      return { k, e, status };
    });
    const mine = token ? list.find((x) => x.e.token === token) : null;
    const reveal = !!mine && mine.status !== "playing"; // Nick, Nov 16 2026: no routes until you've made your own attempt
    const st = await this.streaks(list.map((x) => x.k), date);
    const rank = (x) => (x.status === "done" ? 0 : x.status === "dnf" ? 1 : 2);
    list.sort((a, b) => rank(a) - rank(b) || (a.e.ms || 0) - (b.e.ms || 0) || (a.e.clicks || 0) - (b.e.clicks || 0) || a.e.startedAt - b.e.startedAt);
    const p = dailyPair(date);
    return {
      date, today: t, n: p.n, start: p.start, target: p.target,
      revealed: !!reveal,
      you: mine ? { name: mine.e.name, status: mine.status, ms: mine.e.ms || null, clicks: mine.e.clicks ?? null, path: mine.e.path || [] } : null,
      board: list.map((x) => ({
        name: x.e.name, status: x.status, streak: st[x.k] || 0,
        ms: x.status === "done" ? x.e.ms : null,
        clicks: x.status === "done" ? x.e.clicks : null,
        path: reveal ? x.e.path || [] : undefined,
        you: mine ? x === mine : false,
      })),
      shortest: reveal ? data.shortest : null,
      hasShortest: !!data.shortest,
    };
  }

  async fetch(req) {
    const url = new URL(req.url);
    const sub = url.pathname.replace(/^\/wikirace\/api\//, "");
    const t = today();
    let body = {};
    if (req.method === "POST") { try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); } }

    if (sub === "daily" && req.method === "GET") {
      let date = url.searchParams.get("date") || t;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > t || date < FIRST_DAY) date = t;
      return json(await this.board(date, url.searchParams.get("token") || ""));
    }

    // Solo mode (Nick, Nov 16 2026): past dailies to replay (never today's or future ones) + the page pool for random races.
    if (sub === "pairs" && req.method === "GET") {
      const past = [];
      for (let d = addDays(t, -1); d >= FIRST_DAY && past.length < 60; d = addDays(d, -1)) {
        const p = dailyPair(d);
        const data = await this.day(d);
        const best = Object.values(data.entries).filter((e) => e.status === "done").sort((a, b) => a.ms - b.ms || a.clicks - b.clicks)[0];
        past.push({ date: d, n: p.n, start: p.start, target: p.target, best: best ? { name: best.name, ms: best.ms, clicks: best.clicks } : null });
      }
      return json({ today: t, past, pool: [...new Set(PAIRS.flat())] });
    }

    if (sub === "daily/claim" && req.method === "POST") {
      const name = cleanName(body.name), k = keyOf(name);
      if (!name) return json({ error: "Type a name first." }, 400);
      const data = await this.day(t);
      if (data.entries[k]) return json({ error: `${data.entries[k].name} already played today's race. One go per name per day.` }, 409);
      const token = crypto.randomUUID();
      data.entries[k] = { name, token, status: "playing", startedAt: Date.now(), path: [] };
      await this.ctx.storage.put("d:" + t, data);
      const p = dailyPair(t);
      return json({ token, date: t, n: p.n, start: p.start, target: p.target, startedAt: data.entries[k].startedAt });
    }

    if ((sub === "daily/step" || sub === "daily/finish") && req.method === "POST") {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : t;
      const data = await this.day(date);
      const k = Object.keys(data.entries).find((key) => data.entries[key].token === body.token);
      if (!k) return json({ error: "Unknown run." }, 404);
      const e = data.entries[k];
      if (e.status !== "playing") return json(await this.board(date, body.token));
      e.path = cleanPath(body.path);
      if (sub === "daily/finish") {
        const elapsed = Date.now() - e.startedAt;
        e.status = body.status === "done" ? "done" : "dnf";
        e.ms = Math.max(0, Math.min(Math.round(+body.ms || 0), elapsed + 5000));
        e.clicks = Math.max(0, e.path.length - 1);
        const played = new Set((await this.ctx.storage.get("n:" + k)) || []);
        played.add(date);
        await this.ctx.storage.put("n:" + k, [...played].sort().slice(-400));
      }
      await this.ctx.storage.put("d:" + date, data);
      return sub === "daily/step" ? json({ ok: true }) : json(await this.board(date, body.token));
    }

    if (sub === "daily/shortest" && req.method === "POST") {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : t;
      const path = Array.isArray(body.path) ? body.path.slice(0, 12).map(cleanTitle).filter(Boolean) : [];
      const data = await this.day(date);
      if (path.length >= 2 && (!data.shortest || path.length < data.shortest.length)) {
        data.shortest = path;
        await this.ctx.storage.put("d:" + date, data);
      }
      return json({ shortest: data.shortest });
    }

    return json({ error: "not found" }, 404);
  }
}

// ---------------------------------------------------------------- Race rooms
const MAX_GROUP = 16;
const COUNTDOWN_MS = 4000;
const ROOM_TTL_MS = 12 * 3600e3;

export class Race extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
    ctx.blockConcurrencyWhile(async () => { this.s = (await ctx.storage.get("s")) || null; });
  }
  async save() {
    await this.ctx.storage.put("s", this.s);
    await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
  }
  async alarm() {
    await this.ctx.storage.deleteAll();
    this.s = null;
    for (const w of this.ctx.getWebSockets()) { try { w.close(4002, "expired"); } catch {} }
  }

  async fetch(req) {
    const url = new URL(req.url);
    const code = url.pathname.slice(-4).toUpperCase();
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      cid: (url.searchParams.get("cid") || "").slice(0, 40),
      name: cleanName(url.searchParams.get("name")) || "Someone",
      create: url.searchParams.get("create") === "1",
      max: url.searchParams.get("max") === "2" ? 2 : MAX_GROUP,
      code,
    });
    return new Response(null, { status: 101, webSocket: client });
  }

  sockets(except) { return this.ctx.getWebSockets().filter((w) => w !== except && w.readyState === WebSocket.OPEN); }
  info(ws) { try { return ws.deserializeAttachment() || {}; } catch { return {}; } }
  online(except) { return new Set(this.sockets(except).map((w) => this.info(w).cid)); }
  send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch {} }

  view(forCid, online) {
    const s = this.s;
    const ids = Object.keys(s.players);
    const results = s.phase === "results";
    const mine = s.players[forCid];
    const raced = !!mine && (mine.status === "done" || mine.status === "dnf");
    const players = ids.map((cid) => {
      const p = s.players[cid];
      const o = {
        id: p.id, name: p.name, ready: !!p.ready, status: p.status,
        online: online.has(cid), host: cid === s.host, you: cid === forCid,
      };
      if (results || cid === forCid) { o.ms = p.ms ?? null; o.clicks = p.clicks ?? null; }
      if (results && raced && (p.status === "done" || p.status === "dnf")) o.path = p.path || [];
      return o;
    });
    return {
      t: "state", code: s.code, max: s.max, phase: s.phase, round: s.round,
      start: s.start, target: s.target, startAt: s.startAt, now: Date.now(),
      players, raced, shortest: results && raced ? s.shortest : null, hasShortest: !!s.shortest,
    };
  }
  broadcast(except) {
    const online = this.online(except);
    for (const w of this.sockets(except)) this.send(w, this.view(this.info(w).cid, online));
  }
  fixHost(except) {
    const online = this.online(except);
    if (this.s.host && online.has(this.s.host)) return;
    const next = Object.keys(this.s.players).find((cid) => online.has(cid));
    if (next) this.s.host = next;
  }
  checkDone() {
    const s = this.s;
    if (s.phase !== "racing") return;
    const racers = Object.values(s.players).filter((p) => p.status !== "watch" && p.status !== "lobby");
    if (racers.length && racers.every((p) => p.status === "done" || p.status === "dnf")) s.phase = "results";
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== "string") return;
    let m; try { m = JSON.parse(raw); } catch { return; }
    const me = this.info(ws);
    const cid = me.cid;
    if (!cid) return;

    if (m.t === "hello") {
      if (!this.s) {
        if (!me.create) { this.send(ws, { t: "nope", why: "No room with that code. Check it, or start a new one." }); try { ws.close(4004, "no room"); } catch {} return; }
        this.s = { code: me.code, max: me.max, host: cid, creator: cid, phase: "lobby", round: 1, start: "", target: "", startAt: 0, players: {}, nextId: 1, shortest: null, created: Date.now() };
      } else if (me.create && !this.s.players[cid] && Object.keys(this.s.players).length) {
        this.send(ws, { t: "taken" }); try { ws.close(4005, "taken"); } catch {} return;
      }
      for (const w of this.sockets(ws)) if (this.info(w).cid === cid) { try { w.close(4000, "replaced"); } catch {} }
      const s = this.s;
      if (!s.players[cid]) {
        const count = Object.values(s.players).filter((p) => p.status !== "watch").length;
        const late = s.phase !== "lobby";
        if (!late && count >= s.max) { this.send(ws, { t: "nope", why: s.max === 2 ? "This head-to-head already has two racers." : "This room is full." }); try { ws.close(4001, "full"); } catch {} return; }
        s.players[cid] = { id: s.nextId++, name: me.name, ready: false, status: late ? "watch" : "lobby", path: [] };
      } else {
        s.players[cid].name = me.name || s.players[cid].name;
      }
      // Whoever made the room gets the host spot back if they reload or drop out and return.
      if (cid === s.creator) s.host = cid;
      this.fixHost();
      await this.save();
      this.broadcast();
      return;
    }
    const s = this.s;
    if (!s || !s.players[cid]) return;
    const p = s.players[cid];
    const isHost = cid === s.host;

    switch (m.t) {
      case "ready":
        if (s.phase !== "lobby") return;
        p.ready = !!m.v;
        break;
      case "name":
        p.name = cleanName(m.name) || p.name;
        break;
      case "pair":
        if (!isHost || s.phase !== "lobby") return;
        s.start = cleanTitle(m.start); s.target = cleanTitle(m.target); s.shortest = null;
        break;
      case "random": {
        if (!isHost || s.phase !== "lobby") return;
        const all = [...new Set(PAIRS.flat())];
        const a = all[Math.floor(Math.random() * all.length)];
        let b = a; while (b === a) b = all[Math.floor(Math.random() * all.length)];
        s.start = a; s.target = b; s.shortest = null;
        break;
      }
      case "go": {
        if (!isHost || s.phase !== "lobby" || !s.start || !s.target) return;
        const online = this.online();
        s.phase = "racing";
        s.startAt = Date.now() + COUNTDOWN_MS;
        for (const [id, q] of Object.entries(s.players)) {
          q.ms = null; q.clicks = null; q.path = [];
          q.status = online.has(id) ? "racing" : "watch";
        }
        break;
      }
      case "step":
        if (s.phase !== "racing" || p.status !== "racing") return;
        p.path = cleanPath(m.path);
        break;
      case "finish":
      case "giveup":
        if (s.phase !== "racing" || p.status !== "racing") return;
        p.path = cleanPath(m.path);
        p.status = m.t === "finish" ? "done" : "dnf";
        p.ms = Math.max(0, Math.min(Math.round(+m.ms || 0), Date.now() - s.startAt + 3000));
        p.clicks = Math.max(0, p.path.length - 1);
        this.checkDone();
        break;
      case "end":
        if (!isHost || s.phase !== "racing") return;
        for (const q of Object.values(s.players)) if (q.status === "racing") { if (!q.path || !q.path.length) q.path = [{ t: s.start, at: 0 }]; q.status = "dnf"; q.ms = Date.now() - s.startAt; q.clicks = Math.max(0, (q.path || []).length - 1); }
        s.phase = "results";
        break;
      case "again":
        if (!isHost || s.phase !== "results") return;
        s.phase = "lobby"; s.round++; s.startAt = 0; s.shortest = null;
        if (m.swap) { const a = s.start; s.start = s.target; s.target = a; } else { s.start = ""; s.target = ""; }
        for (const q of Object.values(s.players)) { q.status = "lobby"; q.ready = false; q.ms = null; q.clicks = null; q.path = []; }
        break;
      case "shortest": {
        const path = Array.isArray(m.path) ? m.path.slice(0, 12).map(cleanTitle).filter(Boolean) : [];
        if (path.length >= 2 && (!s.shortest || path.length < s.shortest.length)) s.shortest = path;
        break;
      }
      case "kick": {
        if (!isHost || s.phase !== "lobby") return;
        const target = Object.keys(s.players).find((k) => s.players[k].id === m.id && k !== cid);
        if (target) {
          delete s.players[target];
          for (const w of this.sockets()) if (this.info(w).cid === target) { this.send(w, { t: "nope", why: "The host removed you from the room." }); try { w.close(4003, "kicked"); } catch {} }
        }
        break;
      }
      default:
        return;
    }
    await this.save();
    this.broadcast();
  }

  async webSocketClose(ws, code) {
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, "bye"); } catch {}
    if (!this.s) return;
    const cid = this.info(ws).cid;
    // Someone who leaves the lobby frees their spot; mid-race they stay in (the host can end the race).
    if (this.s.phase === "lobby" && cid && this.s.players[cid] && !this.online(ws).has(cid)) delete this.s.players[cid];
    this.fixHost(ws);
    await this.save();
    this.broadcast(ws);
  }
  async webSocketError(ws) { await this.webSocketClose(ws, 1006); }
}
