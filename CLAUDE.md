# buggybuilds.org — Smiski Generator

buggybuilds.org is now only the Smiski Generator (Nick, Oct 26 2026: he removed the project hub, the Cereal Bowlers card and Fretfire from this site). Nick asks for changes by chatting with Claude; Claude edits, checks and pushes to `main`. Cloudflare Workers Builds deploys `public/` about a minute after each push. Static only: no server code, no accounts.

## Files
- `public/index.html` — the generator page: selected Smiski at the top (name, collection, number, link to the official series page), its clay scenes below, the full collection at the bottom. Fonts Fredoka + Nunito, glow-green accent, light and dark mode.
- `public/data.js` — every figure from the official site (smiski.com/e/products), 19 series x 6, each with 3 scenes as `"backdrop|mood|Title|props"` (342 total). Only add figures named on the official site; secret figures aren't named there.
- `public/clay.js` — draws scenes as 800x500 SVG with a clay filter; `BACKDROPS`, `PROPS`, moods and glow lights live there. The glowing pad is where the figure stands.
- Buy links (Nick, Oct 26 2026): each series has `shop`, its page on the official Dreams USA store (sonnyangelusa.com). Series 3, Series 4 and Cheer aren't sold there, so they link to the store's Smiski collection.
- Never draw the Smiski character or copy official product photos onto the site (it's Dreams Inc.'s character); link to the official series page instead.
- `public/_redirects` sends old /smiski and /fretfire links to the home page. `public/404.html`, `public/icon.svg`, `wrangler.jsonc` (Worker name `buggybuilds-hub` — don't rename it; Cloudflare's build and the custom domain are attached to that name).

## Rules
- Separate from the Cereal Bowlers league site (repo `BuggySmalls/buggybuilds`, cerealbowlers.org). Don't link between the two.
- Fretfire's last version is in git history (commit before "Smiski Generator only") if Nick wants it back somewhere.

## Before every push
`node --check public/clay.js public/data.js`, then open `public/index.html` in Playwright at phone width (390px) and desktop, light and dark, and check there are no console errors. Commit with a plain message, push to `main`, tell Nick it'll be live in about a minute.
