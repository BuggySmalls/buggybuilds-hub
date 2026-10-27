# buggybuilds.org — Nick's project hub

Nick's home page for his side projects. Nick asks for changes by chatting with Claude; Claude edits, checks and pushes to `main`. Cloudflare Workers Builds deploys `public/` about a minute after each push (Worker `buggybuilds-hub`; it reports a "Workers Builds" check run on each commit, so `gh api repos/BuggySmalls/buggybuilds-hub/commits/<sha>/check-runs` shows whether a deploy went through). Static only: no server code, no accounts.

## Current state (Nick, Oct 26 2026)
- Home page is the "Index" design (Nick picked it over arcade, retro desktop and corkboard): Swiss magazine contents page, Inter Tight + JetBrains Mono, paper `#F1EFEA`, ink `#111`, one red `#FF3B1F`, light and dark mode. Sections: index of works (numbered rows; hover floats a picture, shows a description), scrolling marquee, changelog, "At a glance" facts, footer.
- Branding (Nick, Oct 26 2026): always write the name as **BuGGy Builds** (or **BuGGyBuilds**) — never "Buggy Builds".
- Version tracking (Nick, Oct 26 2026): the `LOG` array at the bottom of `public/index.html` is the changelog; its first entry sets the version shown top right, in the about facts and in the footer. **Every update to the site adds a new entry at the top and bumps the version by .01** (1.00 → 1.01 → 1.02 …), with the date and a few plain lines on what changed.
- Projects on the index: Fretfire (`/fretfire/`), Cereal Bowlers (https://cerealbowlers.org), and one "Coming soon" row. Smiski Generator abandoned for now (last version in git history, commit b191a7b).
- `public/fretfire/index.html` — Fretfire, Nick's Guitar Hero-style browser game. Self-contained single file.
- Fretfire song library (Oct 27 2026): `public/fretfire/songs/songs.json` lists MP3s in that folder (format in `songs/README.md`). Charts are built in the browser: band-split onset detection → tempo + phase search → notes snapped to the beat grid, deterministic per song+difficulty. When Nick sends audio, convert with ffmpeg to MP3 ~160 kbps, add the file + manifest entry, and spot-check the detected tempo (fix with `bpm` in the manifest). Spotify/Apple Music/Pandora can't feed the game (DRM, no raw audio).
- `public/404.html` (same Index look), `public/icon.svg`, `public/_redirects` (old /smiski links go home), `wrangler.jsonc` (Worker name `buggybuilds-hub` — don't rename it).

## Rules
- No copy describing the site or who made it (Nick, Oct 27 2026): no tagline, no about blurb, no "made by Nick", no "made in Rhode Island". Project rows can keep their own short descriptions.
- Separate from the Cereal Bowlers league site (repo `BuggySmalls/buggybuilds`). Linking from here to cerealbowlers.org is fine; cerealbowlers.org must never link back here.
- Only list projects Nick says are public. Don't put personal finance, trading or job-search tools on the site unless he asks.

## Before every push
Open each changed page in Playwright at phone width (390px) and desktop and check there are no console errors and no sideways scroll. Commit with a plain message, push to `main`, then confirm the Workers Builds check run succeeded.
