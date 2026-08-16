# Virtuelles Museum — Backend-Architektur-Skizze

Dieses Dokument beschreibt eine mögliche zukünftige Backend-Architektur für das virtuelle Museum. Es ist bewusst eine **Skizze**, keine vollständige Spezifikation. Ziel ist es, eine erweiterbare, kostengünstige Basis zu definieren, mit der Räume, Kunstwerke, Künstler und multimediale Inhalte verwaltet werden können.

---

## 1. Status heute: statisches Frontend mit erweiterten Features

Aktuell besteht das Museum aus reinem HTML, CSS und JavaScript (kein Backend):

| Komponente | Wo liegt sie |
|------------|--------------|
| 3D-Rendering und Interaktion | `js/app.js` |
| Layout und Styling | `css/styles.css` |
| Künstler-, Werk- und Relationsdaten | `data/artists.json` (statische JSON-Datei, 47 Künstler, 141+ Werke, 275 Relationen) |
| Bildquellen | Externe Wikimedia-URLs (CORS-fähig) |
| Audio-Guide | Web Speech API (TTS, clientseitig) |
| Favoriten | `localStorage` (clientseitig) |
| Hosting | GitHub Pages |

**Umgesetzte Features (Stand 2026-08-16):** Timeline mit 8 Epochen, 3D-Räume mit Portalen, Werk-Karussell, Audio-Guide (TTS), Künstler-Relationen, Favoriten, Teilen/Deep-Link, Mehrsprachigkeit (EN/DE), Mobile-Touch-Steuerung, Suche (inkl. Werktitel).

Für einen Prototypen und einen ersten öffentlichen Eindruck reicht das. Sobald das Museum wachsen soll — mehr Räume, wechselnde Ausstellungen, eigene Inhalte, serverseitige Nutzerfunktionen (Accounts, geteilte Favoriten) — wird ein Backend sinnvoll.

---

## 2. Zielbild

Ein schlankes, erweiterbares Museumssystem:

- **Inhalte zentral pflegen** über ein Admin-Panel (Künstler, Werke, Räume, Ausstellungen).
- **API für das Frontend**, um Inhalte dynamisch zu laden.
- **Bild- und Medien-Speicher** für eigene Werke, Audio-Guides, Texte.
- **Optionale Nutzerfunktionen** später: Favoriten, besuchte Werke, Kuratoren-Touren.

---

## 3. Empfohlene Architektur

### 3.1 Variantenvergleich

| Lösung | Bestens geeignet für | Aufwand | Kosten (Start) |
|--------|----------------------|---------|----------------|
| **Supabase (Hosted)** | Schneller Start, PostgreSQL, Auth, Storage, API out-of-the-box | Gering | Kostenlos bis zu einem gewissen Limit |
| **Directus (Self-Hosted auf VPS)** | Volle Kontrolle, flexibles Datenmodell, Admin-UI | Mittel | Nur Serverkosten |
| **Strapi (Self-Hosted)** | Große Community, viele Plugins | Mittel | Nur Serverkosten |
| **Sanity / Contentful (SaaS)** | Reiner Content-Only-Fokus, schnell | Gering | Free Tier, später teuer |
| **Statische JSON + Build-Pipeline** | Sehr wenige, seltene Änderungen | Sehr gering | Kostenlos |

### 3.2 Empfehlung: Supabase oder Directus

Für das virtuelle Museum empfehlen wir eine von zwei Varianten:

#### Variante A: Supabase (empfohlen für schnellen Start)

- **Datenbank:** PostgreSQL mit echten Tabellen für Künstler, Werke, Räume, Ausstellungen.
- **API:** Auto-generierte REST- und GraphQL-APIs.
- **Storage:** Bilder, Audio-Dateien und andere Medien ablegen.
- **Auth:** Später für Favoriten, besuchte Werke, ggf. Kuratoren-Accounts nutzbar.
- **Admin-Panel:** Web-UI zum Bearbeiten der Inhalte.
- **Kosten:** Free Tier deckt den Start ab.

#### Variante B: Directus (empfohlen für volle Kontrolle)

- **Datenbank:** Beliebige SQL-Datenbank (z.B. PostgreSQL oder SQLite).
- **API:** REST und GraphQL.
- **Storage:** Files-System oder S3-kompatibler Speicher.
- **Auth:** Eingebaut, rollenbasiert.
- **Admin-Panel:** Sehr flexibel, direkt an Datenmodell gekoppelt.
- **Kosten:** Open Source, läuft auf eigenem Server.

---

## 4. Datenmodell (Vorschlag)

```text
artist
├── id
├── name
├── years
├── bio
├── image_url
├── website_url
└── created_at

artwork
├── id
├── title
├── artist_id → artist.id
├── year
├── description
├── image_url
├── audio_guide_url (optional)
├── room_id → room.id
├── position_x / position_y / position_z
├── wall (north, east, south, west)
└── created_at

room
├── id
├── name (z.B. „Renaissance Hall“)
├── theme
├── ambient_light_color
├── floor_texture_url
├── wall_texture_url
└── created_at

exhibition (optional, für thematische Führungen)
├── id
├── title
├── description
├── start_date / end_date
├── artwork_ids (Array)
└── created_at
```

---

## 5. Frontend-Anpassungen bei Backend-Einführung

- `data/artists.json` wird durch API-Aufrufe ersetzt (z.B. `GET /api/artworks?room_id=1`).
- `js/app.js` bekommt ein Laden-Overlay und einen einfachen Cache.
- Bilder werden aus dem Backend-Storage geladen (oder weiterhin aus verlässlichen externen Quellen mit Fallback).
- Neue Interaktionen werden möglich: Audio-Guide abspielen, Werke merken, zwischen Räumen wechseln.

---

## 6. Nächste Schritte (vorgeschlagen)

1. **Entscheidung treffen:** Supabase oder Directus?
2. **Proof of Concept:** Eine kleine Test-Datenbank anlegen und ein einziges Gemälde über die API laden.
3. **Migration der bestehenden JSON-Daten:** Künstler und Werke aus `data/artists.json` in die Datenbank überführen.
4. **Bildhosting klären:** Eigenes Storage oder weiterhin Wikimedia mit Fallback?
5. **Deployment-Strategie:** GitHub Pages reicht für reines Frontend; bei Auth/User-Daten braucht man ggf. ein anderes Hosting.

---

## 7. Offene Fragen

- Sollen Besucher später Accounts haben (Favoriten, History) oder bleibt es anonym?
- Sollen Ausstellungen zeitlich begrenzt sein und automatisch wechseln?
- Welche Medien sollen unterstützt werden? (Bilder, Audio, Video, 3D-Modelle?)
- Soll es mehrsprachige Inhalte geben (DE/EN/TH)?

---

*Diese Skizze ist bewusst klein gehalten. Sie kann erweitert werden, sobald eine konkrete Richtung feststeht.*
