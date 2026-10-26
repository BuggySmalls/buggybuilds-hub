# buggybuilds-hub

The site at **buggybuilds.org**: a home page for Nick Buggy's side projects.

- `public/` is served as-is by a Cloudflare Worker (`wrangler.jsonc`, Worker name `buggybuilds-hub`).
- Every push to `main` deploys automatically through Cloudflare Workers Builds.
- `public/fretfire/` is the Fretfire rhythm game, playable at buggybuilds.org/fretfire.
