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
pnpm run ogp      # ogp/template.html を Playwright で撮る → public/images/ogp.png
pnpm run deploy   # pnpm build && wrangler deploy — `run` is required, see below
```

There is no test suite. `pnpm build` (which runs `tsc -b` across all three project references) plus `pnpm lint` is the full verification loop — that is exactly what `.github/workflows/ci.yml` runs on pull requests. Pushing to `main` additionally runs that workflow's `deploy` job (gated on `verify` passing), so a merge ships to production.

`pnpm run deploy` must keep its `run`: bare `pnpm deploy` resolves to pnpm's built-in workspace-deploy command, which shadows the script and fails with `ERR_PNPM_CANNOT_DEPLOY` since this repo is not a workspace.

Anything touching `worker/index.ts` or a proxied prefix (`/medley-generator/`, `/avvy-deco`) must be verified with `pnpm worker:dev`, not `pnpm dev` — Vite alone never runs the Worker.

## Architecture

**One Worker, two responsibilities** (`worker/index.ts`). A prefix listed in `PROXY_TARGETS` is proxied to an external deploy; everything else falls through to `env.ASSETS.fetch` (the Vite build in `dist/`, bound in `wrangler.jsonc`). A single deploy target was chosen over a separate Pages project + Worker.

| Prefix | Upstream | `normalizeTrailingSlash` | `dropLocation` |
|---|---|---|---|
| `/medley-generator` | GitHub Pages (`naturalclar.github.io`) | `true` | `true` |
| `/avvy-deco` | Vercel / Next (`avvy-deco.vercel.app`) | `false` | `false` |

The proxy is deliberate, not a redirect — the browser URL stays `smashcat.dev` so search results attribute the tool to this domain. The non-obvious constraints:

- `Host` (and `cf-connecting-ip`/`cf-ray`) must be stripped and the upstream URL rebuilt. Both GitHub Pages and Vercel pick the site from the `Host` header; forwarding `Host: smashcat.dev` yields a 404.
- Each prefix must stay in sync with the path the upstream is built with — medley-generator's Vite `base`, avvy-deco's Next `basePath`. Built asset paths (`/medley-generator/assets/...`, `/avvy-deco/_next/...`) resolve only if both sides agree. This site's own `base` stays at the default `/`.
- **The two flags are per-upstream and opposite here — don't unify them.** Vite builds resolve assets relatively, so `/prefix` has to be normalized to `/prefix/`; Next emits basePath-absolute URLs and issues its own 308 in the opposite direction, so normalizing there makes the two redirects fight. Dropping `Location` keeps the browser from following the upstream out of `smashcat.dev`, but dropping Next's own basePath 308 leaves a redirect with nowhere to go. Where `Location` is kept, an absolute upstream URL is rewritten back to this host.

**Content lives in `src/data/profile.ts`.** Site copy, links, fan art entries, and tool listings are all exported from there; `src/components/` renders them and should not need editing for content changes. `index.html` duplicates the name/description in `<title>` and OG tags — keep the two in sync.

`profile.ts` and `index.html` still carry `TODO` placeholders (stream name, bio, platform URLs). They must be replaced before the site goes public.

## Conventions

- Relative imports carry explicit `.ts`/`.tsx` extensions (`allowImportingTsExtensions` is on).
- Plain CSS in `src/index.css` with CSS custom properties; light/dark via `prefers-color-scheme` guarded by `:root:not([data-theme='light'])`. No CSS-in-JS or modules.
- Code comments, JSDoc, and user-facing copy are written in Japanese.
- TypeScript is split into three project references — `tsconfig.app.json` (`src`, DOM libs), `tsconfig.worker.json` (`worker`, `@cloudflare/workers-types`, no DOM), `tsconfig.node.json` (`vite.config.ts`). Worker code has no DOM types available.
- `public/` assets ship unoptimized; compress images before adding them. `public/images/avatar.jpg` (square, ≥256px) and `public/images/ogp.png` (1200×630) are referenced but not yet committed.
- `public/images/ogp.png` is generated, not hand-made — `pnpm run ogp` screenshots `ogp/template.html` at 1200×630 and writes it. The template pulls `name`/`tagline` out of `profile.ts` by regex rather than duplicating them, so it fails loudly if those `export const` lines change shape. The illustration comes from `ogp/art.png` (untracked until supplied); without it the right panel renders a placeholder. Rendering depends on the host's fonts, so re-check the output visually when regenerating on a different machine.
- Fan art requires `artist` and `artistUrl` by type — entries are only added with the artist's permission.
