// Passcode gate for /health (the Health tracker). Nick, Nov 16 2026.
// Without the unlock cookie, every /health path gets the keypad page below instead of the app.
// POST /health/unlock with the right code sets a year-long cookie on that browser; /health/lock clears it.
// Only a hash of the code lives here, since the repo is public.
const CODE_HASH = "eea0d83a333a6391bf575495f18fe2125d2f4e8e26abf02fe74c6c533c0b37be"; // sha256("buggybuilds-health:" + code)
const COOKIE = "bb_health";
const YEAR = 60 * 60 * 24 * 365;

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const token = () => sha256(CODE_HASH + ":unlocked");

function cookie(req, name) {
  const m = (req.headers.get("Cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : "";
}

export async function handleHealth(req, env, url) {
  const p = url.pathname;
  if (p === "/health/unlock" && req.method === "POST") {
    let code = "";
    try {
      const ct = req.headers.get("Content-Type") || "";
      if (ct.includes("json")) code = String((await req.json()).code || "");
      else code = String((await req.formData()).get("code") || "");
    } catch {}
    code = code.replace(/\D/g, "").slice(0, 12);
    const ok = code && (await sha256("buggybuilds-health:" + code)) === CODE_HASH;
    const json = (req.headers.get("Accept") || "").includes("json");
    if (!ok) {
      await new Promise((r) => setTimeout(r, 700)); // slow down guessing
      if (json) return Response.json({ ok: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
      return lockPage(true);
    }
    const h = new Headers({ "Cache-Control": "no-store" });
    h.append("Set-Cookie", `${COOKIE}=${await token()}; Path=/health; Max-Age=${YEAR}; HttpOnly; Secure; SameSite=Lax`);
    if (json) { h.set("Content-Type", "application/json"); return new Response('{"ok":true}', { headers: h }); }
    h.set("Location", "/health/");
    return new Response(null, { status: 303, headers: h });
  }
  if (p === "/health/lock") {
    const h = new Headers({ Location: "/health/", "Cache-Control": "no-store" });
    h.append("Set-Cookie", `${COOKIE}=; Path=/health; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
    return new Response(null, { status: 303, headers: h });
  }
  if (cookie(req, COOKIE) === (await token())) {
    const res = await env.ASSETS.fetch(req);
    const out = new Response(res.body, res);
    out.headers.set("Cache-Control", "private, no-store");
    return out;
  }
  if (p === "/health") return Response.redirect(new URL("/health/", url), 308);
  return lockPage(false);
}

function lockPage(wrong) {
  return new Response(LOCK_HTML.replace("__WRONG__", wrong ? "1" : ""), {
    status: 401,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

const LOCK_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Health · BuGGy Builds</title><link rel="icon" href="/icon.svg" type="image/svg+xml"><meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;900&family=JetBrains+Mono:wght@500&display=swap">
<style>
:root{--paper:#F1EFEA;--ink:#111;--muted:#77736B;--red:#FF3B1F;--line:#111;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--paper:#121211;--ink:#F1EFEA;--muted:#8F8A80;--line:#F1EFEA;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;min-height:100dvh;background:var(--paper);color:var(--ink);font:500 18px/1.4 'Inter Tight',system-ui,sans-serif;display:flex;flex-direction:column;padding:20px;-webkit-tap-highlight-color:transparent}
.m{font:500 12px 'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.top{display:flex;justify-content:space-between;border-bottom:2px solid var(--line);padding-bottom:14px}
.top a{color:inherit;text-decoration:none}.top a:hover{color:var(--red)}
.brand{text-transform:none}
h1{font:900 clamp(72px,20vw,200px)/.82 'Inter Tight';letter-spacing:-.06em;margin:28px 0 0}h1 i{font-style:normal;color:var(--red)}
main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;padding:30px 0}
.dots{display:flex;gap:18px}
.dots span{width:16px;height:16px;border-radius:50%;border:2px solid var(--ink);transition:background .12s}
.dots span.on{background:var(--ink)}
.dots.bad{animation:shake .4s}.dots.bad span{border-color:var(--red)}.dots.bad span.on{background:var(--red)}
@keyframes shake{20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
.pad{display:grid;grid-template-columns:repeat(3,76px);gap:14px}
.pad button{width:76px;height:76px;border-radius:50%;border:2px solid var(--ink);background:transparent;color:var(--ink);font:500 28px 'Inter Tight',system-ui;cursor:pointer;touch-action:manipulation}
.pad button:active{background:var(--ink);color:var(--paper)}
.pad button.k{border-color:transparent;font:500 12px 'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.pad button.k:active{background:transparent;color:var(--red)}
#msg{min-height:1.2em}
#msg.bad{color:var(--red)}
form.nojs{display:flex;gap:8px}
@media (prefers-reduced-motion:reduce){.dots.bad{animation:none}}
</style></head>
<body>
<div class="top m"><a class="brand" href="/">BuGGy Builds</a><span>05 · Health</span><a href="/">Index</a></div>
<h1>Health<i>.</i></h1>
<main>
  <div class="m" id="msg">Enter passcode</div>
  <div class="dots" id="dots" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
  <div class="pad" id="pad">
    <button>1</button><button>2</button><button>3</button>
    <button>4</button><button>5</button><button>6</button>
    <button>7</button><button>8</button><button>9</button>
    <button class="k" data-k="clear">Clear</button><button>0</button><button class="k" data-k="back">Delete</button>
  </div>
  <noscript><form class="nojs" method="post" action="/health/unlock"><input name="code" inputmode="numeric" autocomplete="off" aria-label="Passcode"><button>Unlock</button></form></noscript>
</main>
<script>
const LEN = 4, dots = [...document.querySelectorAll('#dots span')], box = document.getElementById('dots'), msg = document.getElementById('msg');
let code = '', busy = false;
function draw() { dots.forEach((d, i) => d.classList.toggle('on', i < code.length)); }
function wrong() {
  box.classList.remove('bad'); void box.offsetWidth; box.classList.add('bad');
  msg.textContent = 'Wrong passcode'; msg.className = 'm bad';
  if (navigator.vibrate) navigator.vibrate(120);
  setTimeout(() => { code = ''; draw(); box.classList.remove('bad'); }, 450);
}
async function submit() {
  busy = true; msg.textContent = 'Checking'; msg.className = 'm';
  try {
    const r = await fetch('/health/unlock', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ code }) });
    if (r.ok) { msg.textContent = 'Unlocked'; location.replace('/health/' + location.hash); return; }
    wrong();
  } catch (e) { msg.textContent = 'No connection, try again'; msg.className = 'm bad'; code = ''; draw(); }
  busy = false;
}
function press(k) {
  if (busy) return;
  if (k === 'clear') code = ''; else if (k === 'back') code = code.slice(0, -1);
  else if (code.length < LEN) code += k;
  if (msg.classList.contains('bad') && code) { msg.textContent = 'Enter passcode'; msg.className = 'm'; }
  draw();
  if (code.length === LEN) submit();
}
document.getElementById('pad').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) press(b.dataset.k || b.textContent); });
addEventListener('keydown', (e) => { if (/^\\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('back'); else if (e.key === 'Escape') press('clear'); });
if ('__WRONG__') wrong();
</script>
</body></html>`;
