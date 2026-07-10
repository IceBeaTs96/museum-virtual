# Virtual Renaissance Museum

Minimal browser-based 3D museum MVP built with plain HTML, CSS, JavaScript, and Three.js from a CDN.

## Run Locally

Use a small local HTTP server so `data/artists.json` can be loaded by the browser:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

## Controls

- Click inside the 3D view to enable pointer-lock style looking.
- Drag the mouse or move it while locked to look around.
- Use `W`, `A`, `S`, and `D` to walk through the room.
- Hold `Shift` or `Space` to release pointer lock while clicking a framed painting.

## Project Structure

```text
.
├── index.html
├── css/
│   └── styles.css
├── data/
│   └── artists.json
├── js/
│   └── app.js
├── KONZEPT.md
└── README.md
```

## Scope

This MVP intentionally keeps to one room, five Renaissance artists, static JSON data, and no build step or backend. The broader product concept remains in [KONZEPT.md](./KONZEPT.md).
