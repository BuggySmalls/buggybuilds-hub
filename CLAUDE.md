# buggybuilds.org — Nick's project hub

Nick's home page for his side projects. Nick asks for changes by chatting with Claude; Claude edits, checks and pushes to `main`. Cloudflare Workers Builds deploys `public/` about a minute after each push (Worker `buggybuilds-hub`; it reports a "Workers Builds" check run on each commit, so `gh api repos/BuggySmalls/buggybuilds-hub/commits/<sha>/check-runs` shows whether a deploy went through). Static only: no server code, no accounts.

## Current state (Nick, Oct 26 2026)
- Smiski Generator abandoned for now (last version is in git history, commit b191a7b).
- Picking a home page design: `public/index.html` is a temporary picker linking to four samples in `public/designs/` — `arcade/`, `desktop/` (retro OS), `scrapbook/` (corkboard), `editorial/` (Swiss index). Each has the same three cards: Fretfire (`/fretfire/`), Cereal Bowlers (https://cerealbowlers.org) and a coming-soon spot. When Nick picks one, move it to `public/index.html`, drop its "← All designs" link, and delete `public/designs/`.
- `public/fretfire/index.html` — Fretfire, Nick's Guitar Hero-style browser game. Self-contained single file.
- `public/404.html`, `public/icon.svg`, `public/_redirects` (old /smiski links go home), `wrangler.jsonc` (Worker name `buggybuilds-hub` — don't rename it).

## Rules
- Separate from the Cereal Bowlers league site (repo `BuggySmalls/buggybuilds`). Linking from here to cerealbowlers.org is fine; cerealbowlers.org must never link back here.
- Only list projects Nick says are public. Don't put personal finance, trading or job-search tools on the site unless he asks.

## Before every push
Open each changed page in Playwright at phone width (390px) and desktop and check there are no console errors and no sideways scroll. Commit with a plain message, push to `main`, then confirm the Workers Builds check run succeeded.
