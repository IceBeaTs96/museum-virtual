# Virtual Museum — Timeline + 3D Halls

A browser-based interactive art museum. Start on an epoch timeline, choose a period, and walk through a themed 3D gallery hall with works from that era.

## What's New

### Timeline Entry Screen
When you open the page, you land on an interactive **timeline** showing 5 major art epochs:

| Epoch | Years | Artists |
|-------|-------|---------|
| **Renaissance** | 1400–1600 | 5 |
| **Baroque** | 1600–1750 | 5 |
| **Romanticism** | 1780–1850 | 3 |
| **Impressionism** | 1860–1886 | 4 |
| **Modern** | 1900–1945 | 4 |

Click any epoch dot to see a preview panel with artist cards, then press **"Enter 3D Museum Hall →"** to enter the immersive room.

### Epoch-Themed 3D Rooms
Each epoch has its own color scheme (walls, floor, lighting atmosphere) so the space feels different every time.

### Return Anytime
Inside the 3D room, click **"← Back to Timeline"** in the HUD to return to the epoch selection screen.

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

## Project Structure

```text
.
├── index.html              ← Timeline overlay + 3D museum view
├── css/
│   └── styles.css          ← Timeline styles + 3D HUD + responsive
├── data/
│   └── artists.json        ← 21 artists with epoch, movement, metadata
├── js/
│   └── app.js              ← Timeline logic + Three.js scene manager
├── KONZEPT.md              ← Original German product concept
├── ARCHITECTURE.md         ← Backend architecture sketch
└── README.md               ← This file
```

## Tech Stack

- **Three.js** (CDN) — 3D rendering
- **Vanilla JS** — Timeline logic, scene transitions, data loading
- **CSS Custom Properties** — Epoch color theming
- **Wikimedia Commons** — Public-domain artwork images

## Scope

No build step, no backend, no bundler. Static HTML/CSS/JS served from any HTTP server. The timeline → museum flow works entirely client-side with a single JSON data file.
