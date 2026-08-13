# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

smashcat.dev — a streaming-activity landing page (profile, links to stream platforms, fan art). Vite + React 19 + TypeScript, served from a single Cloudflare Worker that also reverse-proxies `/medley-generator/` to GitHub Pages.

## Commands

```sh
pnpm install
pnpm dev          # Vite dev server only — Worker routing/proxy does NOT apply
pnpm worker:dev   # pnpm build && wrangler dev — the only way to exercise the proxy
pnpm build        # tsc -b && vite build → dist/
pnpm lint         # oxlint
pnpm deploy       # pnpm build && wrangler deploy
```

There is no test suite. `pnpm build` (which runs `tsc -b` across all three project references) plus `pnpm lint` is the full verification loop — that is exactly what `.github/workflows/ci.yml` runs on pull requests.

Anything touching `worker/index.ts` or `/medley-generator/` must be verified with `pnpm worker:dev`, not `pnpm dev` — Vite alone never runs the Worker.

## Architecture

**One Worker, two responsibilities** (`worker/index.ts`). `/medley-generator/*` is proxied to `https://naturalclar.github.io`; everything else falls through to `env.ASSETS.fetch` (the Vite build in `dist/`, bound in `wrangler.jsonc`). A single deploy target was chosen over a separate Pages project + Worker.

The proxy is deliberate, not a redirect — the browser URL stays `smashcat.dev` so search results attribute the tool to this domain. Two non-obvious constraints hold it together:

- `Host` (and `cf-connecting-ip`/`cf-ray`) must be stripped and the upstream URL rebuilt. GitHub Pages picks the site from the `Host` header; forwarding `Host: smashcat.dev` yields a 404.
- The upstream `Location` header is deleted from the response, otherwise the browser navigates away to the GitHub Pages URL.
- The `/medley-generator` prefix must stay in sync with the `base` that medley-generator itself is built with. Built asset paths (`/medley-generator/assets/...`) resolve only if both sides agree. This site's own `base` stays at the default `/`.

**Content lives in `src/data/profile.ts`.** Site copy, links, fan art entries, and tool listings are all exported from there; `src/components/` renders them and should not need editing for content changes. `index.html` duplicates the name/description in `<title>` and OG tags — keep the two in sync.

`profile.ts` and `index.html` still carry `TODO` placeholders (stream name, bio, platform URLs). They must be replaced before the site goes public.

## Conventions

- Relative imports carry explicit `.ts`/`.tsx` extensions (`allowImportingTsExtensions` is on).
- Plain CSS in `src/index.css` with CSS custom properties; light/dark via `prefers-color-scheme` guarded by `:root:not([data-theme='light'])`. No CSS-in-JS or modules.
- Code comments, JSDoc, and user-facing copy are written in Japanese.
- TypeScript is split into three project references — `tsconfig.app.json` (`src`, DOM libs), `tsconfig.worker.json` (`worker`, `@cloudflare/workers-types`, no DOM), `tsconfig.node.json` (`vite.config.ts`). Worker code has no DOM types available.
- `public/` assets ship unoptimized; compress images before adding them. `public/images/avatar.jpg` (square, ≥256px) and `public/images/ogp.png` (1200×630) are referenced but not yet committed.
- Fan art requires `artist` and `artistUrl` by type — entries are only added with the artist's permission.
