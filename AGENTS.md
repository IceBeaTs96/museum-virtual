# AGENTS.md

## Cursor Cloud specific instructions

This repository is a **purely static frontend** (plain HTML/CSS/JS). There is no
build step, no bundler, no backend, no package manager, and no automated tests.
See `README.md` for the product overview and controls.

### Services / how to run

There is a single "service": a static HTTP file server serving the repo root.

- Run from the repository root (the standard command is already in `README.md`):
  `python3 -m http.server 8000`, then open `http://localhost:8000/`.
- You **must** serve over HTTP, not open `index.html` via `file://`. The app uses
  native ES modules and `fetch("data/artists.json")`; both fail under `file://`.
- `js/app.js` imports Three.js from the jsdelivr CDN
  (`https://cdn.jsdelivr.net/npm/three@0.165.0/...`), so running the 3D hall needs
  outbound network egress to that CDN. Artwork thumbnails come from Wikimedia
  Commons; if those hosts are blocked, images silently fall back to blank (the
  data-driven UI still works).

### Lint / test / build

None exist. There is nothing to lint, test, or build — validate changes by loading
the app in a browser against the running dev server.

### Non-obvious gotchas

- The repo is mid-refactor (latest commit `Step 1: Replace 3D scene with simple
  HTML placeholder`). The "enter museum hall" flow does **not** render correctly in
  this state: `css/styles.css` defines `[hidden]` display rules for
  `.museum-view`, `.epoch-detail`, `.panel`, and `.search-results`, but **not** for
  `.timeline-overlay`. Because `.timeline-overlay` sets `display: flex; z-index: 100`,
  toggling its `hidden` attribute in `js/app.js` has no visual effect, so the
  timeline stays on top of the museum view (`z-index: 1`) and the hall placeholder
  appears blank/underneath. The timeline, artist **search**, and **filter chips**
  are fully data-driven and work end-to-end, so use those to verify the environment.
- The `#epoch-detail` panel and its `Enter 3D Museum Hall →` button in `index.html`
  are legacy markup that the current `js/app.js` does not wire up. Clicking an epoch
  dot or the `🎲 Surprise Me!` button calls `enterMuseum()` directly.
