# buggybuilds-hub

The site at **buggybuilds.org**: BuGGy Builds, Nick's project index (Fretfire, Breaker, Events and Gains). `public/` is served as-is by a Cloudflare Worker (`wrangler.jsonc`); `src/worker.js` adds the Breaker voice relay; every push to `main` deploys automatically.
