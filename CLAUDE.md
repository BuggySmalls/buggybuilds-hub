# buggybuilds.org — project hub playbook

Nick's home page for his side projects. Nick asks for changes by chatting with Claude; Claude edits, checks and pushes to `main`. Cloudflare Workers Builds deploys `public/` about a minute after each push. Static only: no server code, no accounts.

## Files
- `public/index.html` — the hub page (one file, inline CSS). "Workbench" look: graph-paper background, ink black, safety orange `#FF5A1F`, Archivo + JetBrains Mono, chunky offset shadows. Light and dark mode both supported.
- Each project is a `.card` in the `main.grid`: a `.tag` (`live` = orange, otherwise yellow), an `.art` block with a small inline SVG, `h2` name, one-line `p`, `.meta` with the address and a call to action. A dashed `.card.soon` is the "Coming up" placeholder.
- `public/fretfire/index.html` — Fretfire, Nick's Guitar Hero-style browser game (started Oct 24 2026 as a chat artifact, moved here Oct 26 2026). Self-contained single file.
- `public/404.html`, `public/icon.svg`, `wrangler.jsonc` (Worker name `buggybuilds-hub` — don't rename it; Cloudflare's build and the custom domain are attached to that name).

## Rules
- Separate from the Cereal Bowlers league site (repo `BuggySmalls/buggybuilds`, Worker `buggybuilds`, cerealbowlers.org). Linking from here to cerealbowlers.org is fine; cerealbowlers.org must never link back to buggybuilds.org.
- Only list projects Nick says are public. Don't put personal finance, trading or job-search tools on the site unless he asks.
- New project = new folder under `public/<name>/` with its own `index.html`, plus a card on the hub.

## Before every push
Open `public/index.html` (and any changed project) in Playwright at phone width (390px) and desktop, light and dark, and check there are no console errors. Commit with a plain message, push to `main`, tell Nick it'll be live in about a minute.
