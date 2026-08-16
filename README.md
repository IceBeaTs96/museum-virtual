# Virtual Museum — Timeline + 3D Halls

A browser-based interactive art museum. Start on an epoch timeline, choose a period, and walk through a themed 3D gallery hall with works from that era.

## Features

### Timeline Entry Screen
An interactive, zoomable **timeline** showing 8 major art epochs:

| Epoch | Years | Artists |
|-------|-------|---------|
| **Proto-Renaissance** | 1200–1400 | 1 |
| **Renaissance** | 1400–1600 | 8 |
| **Baroque** | 1600–1750 | 7 |
| **Asian Art** | 1600–1900 | 2 |
| **Romanticism** | 1780–1850 | 4 |
| **Impressionism** | 1860–1900 | 6 |
| **Modern** | 1900–1945 | 11 |
| **Contemporary** | 1945–2025 | 8 |

Click any epoch dot to see a preview panel with artist cards, then press **"Enter 3D Museum Hall →"** to enter the immersive room.

### Epoch-Themed 3D Rooms
Each epoch has its own color scheme (walls, floor, lighting atmosphere) so the space feels different every time. Walk between rooms via navigation portals.

### Artist Info Panel
Click a painting to open a rich info panel with:
- **Artwork carousel** — the primary work plus up to 3 additional works per artist (141 extra works fetched from Wikimedia Commons)
- **Audio guide** — "Read aloud" reads the biography via the Web Speech API
- **Related artists** — clickable chips linking to artists in the same movement, overlapping lifetimes, or same epoch
- **Favorites** — save artists to `localStorage` and filter the timeline by them
- **Share** — copy a deep link (`?artist=<id>`) or use the native share sheet

### Search & Filter
- Full-text search across artist names, movements, nationalities, biographies, **and artwork titles**
- Filter chips per epoch, plus a "Favorites" filter
- "Surprise Me!" jumps to a random epoch

### Language
Toggle between **English** and **German** for all UI text.

### Mobile
Touch controls (virtual joystick + drag-to-look) appear automatically on coarse-pointer devices.

---

## Run Locally

Use a local HTTP server so `data/artists.json` can be loaded:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

## Controls (Inside 3D Hall)

- Click inside the 3D view to enable pointer-lock looking.
- Drag the mouse or move it while locked to look around.
- Use `W`, `A`, `S`, and `D` to walk through the room.
- Hold `Shift` or `Space` to release pointer lock, then click a painting frame.
- Click a painting to open the artist info panel.
- On touch devices: left joystick to move, right side drag to look.

## Project Structure

```text
.
├── index.html              ← Timeline overlay + 3D museum view
├── css/
│   └── styles.css          ← Timeline styles + 3D HUD + responsive
├── data/
│   └── artists.json        ← 47 artists with epoch, movement, artworks, relations
├── js/
│   └── app.js              ← Timeline logic + Three.js scene manager
├── scripts/
│   ├── enrich_artworks.py  ← Fetch additional works from Wikimedia Commons
│   └── build_relations.py  ← Compute artist relations from metadata
├── KONZEPT.md              ← Original German product concept
├── ARCHITECTURE.md         ← Backend architecture sketch
└── README.md               ← This file
```

## Tech Stack

- **Three.js** (CDN) — 3D rendering
- **Vanilla JS** — Timeline logic, scene transitions, data loading
- **CSS Custom Properties** — Epoch color theming
- **Wikimedia Commons** — Public-domain artwork images
- **Web Speech API** — Audio guide (TTS)
- **localStorage** — Favorites

## Scope

No build step, no backend, no bundler. Static HTML/CSS/JS served from any HTTP server. The timeline → museum flow works entirely client-side with a single JSON data file.

## Data Enrichment Scripts

The `scripts/` directory contains two idempotent Python scripts that regenerate parts of `data/artists.json`:

```bash
# Fetch up to 3 additional artworks per artist from Wikimedia Commons
python3 scripts/enrich_artworks.py --limit 3 --width 800

# Recompute artist relations (movement / contemporary / epoch)
python3 scripts/build_relations.py --max 6
```

Both are deterministic and can be re-run whenever the artist list changes.
