# 🏛️ Virtuelles Museum — Projekt-Konzept

> **Status:** MVP umgesetzt + V1-Features weitgehend fertig | **Priorität:** Mittel (Spaß-/Bildungsprojekt)
> **Sprachen:** Deutsch + Englisch (erweiterbar) | **Monetarisierung:** Spenden / Buy Me a Coffee

---

## 🎯 Vision

Ein interaktives, virtuelles Kunst-Museum im Browser:
- **3D-Räume** durchlaufen (wie ein echtes Museum)
- **Unendliche Timeline** — zoombar von prähistorisch bis heute
- **Künstler-Profile** anklickbar → Bilder + Biografie + Werk-Verbindungen
- **Public Domain / CC0 Bilder** aus Wikimedia Commons
- **Datenbasis:** Wikipedia + Wikidata (automatisiert, lizenzrechtlich sauber)

---

## 🔥 Einzigartigkeit / Nische

| Existierend | Unser Vorteil |
|-------------|---------------|
| Google Arts & Culture | Kein 3D-Durchlauf + Timeline |
| Wikidata Knowledge Graph | Nicht immersiv, kein Museum-Erlebnis |
| YouTuber-Projekt (privat) | Nicht öffentlich, nicht Open Source |
| **Unser Projekt** | **3D-Museum + Zoomable Timeline + Wikidata + Open Source** |

---

## 🏗️ Architektur

### Tech-Stack

| Komponente | Technologie | Datenquelle |
|------------|-------------|-------------|
| **3D-Engine** | Three.js / React Three Fiber | Eigene Geometrie |
| **Timeline** | D3.js oder Custom Canvas + Zoom | Wikidata SPARQL |
| **Künstler-Profile** | Wikidata SPARQL + Wikipedia API | Wikipedia Text |
| **Bilder** | Wikimedia Commons API | Public Domain / CC0 Filter |
| **Backend (optional)** | Node.js / Python | Caching, API-Proxy |
| **Hosting** | Hostinger VPS oder Vercel/Netlify | CDN für Bilder |

### Daten-Architektur

```
Wikidata SPARQL
    ↓
Künstler: Name, Geburts-/Sterbedatum, Nationalität, Epoche, Bewegung
    ↓
Wikimedia Commons API
    ↓
Bilder: Filter nach Lizenz (PD-Art, CC0, PD-old)
    ↓
Wikipedia API
    ↓
Biografie-Text (erste 2–3 Absätze)
    ↓
JSON-Datenbank (cached)
    ↓
Frontend (3D + Timeline)
```

---

## 📐 Features (Roadmap)

### MVP (2–3 Wochen)
- [ ] Ein Museum-Raum (z.B. "Renaissance")
- [ ] 10–20 Künstler aus einer Epoche
- [ ] Statische Timeline (horizontal, scrollbar)
- [ ] Klick auf Künstler → Panel mit Bio + 3 Bilder
- [ ] Grundlegende Navigation (WASD / Maus)

### V1 (6–8 Wochen)
- [ ] Mehrere Epochen-Räume (Renaissance, Barock, Moderne...)
- [ ] Übergänge zwischen Räumen (Türen / Portale)
- [ ] Zoomable Timeline (D3.js Zoom + Pan)
  - Reinzoomen = Jahre näher beieinander
  - Rauszoomen = Epochen / Jahrhunderte
- [ ] Filter (Epoche, Nationalität, Bewegung)
- [ ] Suche (Künstler, Werk, Stilrichtung)
- [ ] Mobile-Responsive (Touch-Steuerung)

### V2 (2–3 Monate)
- [ ] **Infinity Timeline** — wirklich unendlich zoombar
- [ ] Künstler-Relationen (Graph-View)
  - Wer beeinflusste wen?
  - Wer war Zeitgenosse?
  - Wer gehörte zur selben Bewegung?
- [ ] Bilder direkt in 3D-Raum als "Gemälde an Wand"
- [ ] Mehrsprachig (DE, EN, FR, ES, IT, TH...)
- [ ] Favoriten / Merkliste (LocalStorage oder Account)
- [ ] Teilen-Funktion (URL zu bestimmtem Künstler/Werk)

### Später / Optional
- [ ] VR-Unterstützung (WebXR)
- [ ] Audio-Guide (TTS pro Künstler)
- [ ] Kurator-Modus (eigene Sammlungen erstellen)
- [ ] Quiz-Modus (für Bildung)
- [ ] Museum-API für andere Entwickler

---

## 🎨 Design-Konzept

### Ästhetik
- **Minimalistisch** — weiße Wände, Holzboden (wie echtes Museum)
- **Fokus auf Kunst** — UI zurückhaltend, Bilder groß
- **Timeline als HUD** — unten oder oben als Overlay
- **Epochen-Farbkodierung** — subtile Farben pro Jahrhundert

### Navigation
- **Desktop:** WASD + Maus (First-Person) oder Orbit-Kamera
- **Mobile:** Touch-Joystick + Pinch-Zoom
- **Timeline:** Scroll (Desktop) / Pinch-Zoom (Mobile)

---

## 📊 Datenquellen & Lizenz

### Wikidata SPARQL (Künstler-Metadaten)
```sparql
SELECT ?artist ?artistLabel ?birthDate ?deathDate ?nationality ?movement
WHERE {
  ?artist wdt:P31 wd:Q5 ;           # human
          wdt:P106 wd:Q1028181 .    # painter (or Q483501 = artist)
  OPTIONAL { ?artist wdt:P569 ?birthDate }
  OPTIONAL { ?artist wdt:P570 ?deathDate }
  OPTIONAL { ?artist wdt:P27 ?nationality }
  OPTIONAL { ?artist wdt:P135 ?movement }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de" }
}
LIMIT 100
```

### Wikimedia Commons (Bilder)
- API-Endpoint: `https://commons.wikimedia.org/w/api.php`
- Filter nach Lizenz: `pd` (public domain), `cc0`, `pd-old`
- Beispiel: Gemälde von Leonardo → `File:Mona_Lisa.jpg`

### Wikipedia (Biografie-Text)
- API: `https://de.wikipedia.org/api/rest_v1/page/summary/Leonardo_da_Vinci`
- Erste 2–3 Absätze extrahieren
- Attribution: "Text von Wikipedia, Lizenz CC BY-SA"

---

## 💰 Monetarisierung (Später)

| Modell | Beschreibung |
|--------|--------------|
| **Spenden** | Buy Me a Coffee / Ko-fi Integration |
| **Förderung** | Kulturelle Stiftungen, Bildungsministerien |
| **API-Zugang** | Falls andere Entwickler Daten nutzen wollen |
| **Merchandise** | Niemals — bleibt sauber |

**Wichtig:** Projekt bleibt Open Source. Monetarisierung nur für Hosting + Weiterentwicklung.

---

## 📣 Marketing / Aufmerksamkeit

| Kanal | Strategie |
|-------|-----------|
| **TikTok** | Shorts: "So sieht 500 Jahre Kunst in 60 Sekunden aus" |
| **YouTube** | Dev-Log / Making-of |
| **Reddit** | r/InternetIsBeautiful, r/dataisbeautiful |
| **Hacker News** | Launch-Post |
| **Kunst-Community** | Collaborations mit Kunst-Kanälen |
| **Bildung** | An Schulen / Universitäten verteilen |

---

## 📁 Datei-Struktur (Projekt)

```
museum-virtual/
├── docs/
│   ├── KONZEPT.md          ← Diese Datei
│   ├── ARCHITEKTUR.md      ← Technische Details (später)
│   ├── DESIGN.md           ← UI/UX-Spezifikation (später)
│   └── ROADMAP.md          ← Detaillierte Roadmap (später)
├── data/
│   ├── wikidata-queries/   ← SPARQL-Queries
│   ├── sample-data/        ← Test-Datensätze
│   └── image-crawler/      ← Wikimedia Commons Scripts
├── frontend/
│   └── (React + Three.js)
├── backend/
│   └── (Node.js / Python API)
└── README.md
```

---

## 🗓️ Zeitplan

| Phase | Zeitraum | Meilenstein |
|-------|----------|-------------|
| **Konzeption** | Ab 06.07. (nach Wien) | Tech-Stack fest, erste Wikidata-Queries |
| **MVP** | Juli | Ein Raum, 10 Künstler, funktioniert im Browser |
| **V1** | August–September | Mehrere Räume, Timeline, Filter |
| **Launch** | Oktober | TikTok-Launch, Hacker News |
| **V2** | Q4 2026 / Q1 2027 | Infinity Timeline, Relationen, Mehrsprachig |

---

## 🎓 Vergleich mit bisherigen Projekten

| Projekt | Zweck | Ernsthaftigkeit |
|---------|-------|-----------------|
| Transcription App | Produktivität | Hoch (echtes Tool) |
| Office Dashboard | Monitoring | Mittel ( intern) |
| PhD Panel | Forschung | Hoch |
| WhatsApp Loyalty | Business | Hoch |
| **Virtuelles Museum** | **Bildung / Spaß** | **Niedrig bis Mittel — aber höherer Impact** |

Steffens Einschätzung: "Viel mehr Wert als Office Dashboard. Reines Spaßprojekt, aber mit echtem gesellschaftlichem Nutzen."

---

## 📝 Offene Fragen / To-Do

- [ ] Projektnamen festlegen
- [ ] Tech-Stack finalisieren (React vs. Vanilla Three.js)
- [ ] Erste Wikidata-Query testen (SPARQL-Endpoint)
- [ ] Wikimedia Commons API-Limit prüfen
- [ ] Hosting-Kosten schätzen (Bilder-Cache, Traffic)
- [ ] Domain-Name überlegen

---

*Erstellt: 2026-06-16*
*Letzte Aktualisierung: 2026-08-16*
*Verantwortlich: Seraphine + Steffen*
