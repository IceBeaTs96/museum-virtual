#!/usr/bin/env python3
"""
Enrich artists.json with additional artworks per artist.

For each artist, query the Wikimedia Commons API for additional works
(excluding the primary imageUrl), and write an `artworks` array of
{ title, imageUrl } objects. The primary imageUrl is kept as-is for
timeline thumbnails and the 3D room.

Usage:
    python3 scripts/enrich_artworks.py [--limit N] [--width W]
"""
import json
import sys
import time
import urllib.parse
import urllib.request

DATA_PATH = "data/artists.json"
API = "https://commons.wikimedia.org/w/api.php"
UA = "MuseumVirtual/1.0 (educational art project; contact: admin@steffen-baltruschat.com)"


def api_get(params):
    params = dict(params)
    params["format"] = "json"
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def search_artworks(artist_name, limit, width):
    """Return list of {title, imageUrl} for an artist, excluding the primary."""
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f"{artist_name} painting",
        "gsrnamespace": "6",
        "gsrlimit": str(limit + 3),
        "prop": "imageinfo",
        "iiprop": "url",
        "iiurlwidth": str(width),
    }
    try:
        data = api_get(params)
    except Exception as e:
        print(f"  ! API error for {artist_name}: {e}", file=sys.stderr)
        return []

    pages = data.get("query", {}).get("pages", {})
    out = []
    for p in pages.values():
        title = p.get("title", "")
        # Skip non-image / non-painting-ish results
        if not title.startswith("File:"):
            continue
        ii = p.get("imageinfo", [{}])[0]
        url = ii.get("thumburl") or ii.get("url")
        if not url:
            continue
        # Clean title -> display name
        name = title[5:]  # strip "File:"
        name = name.rsplit(".", 1)[0]  # strip extension
        out.append({"title": name, "imageUrl": url})
    return out


def normalize_primary(url):
    """Return a canonical key for the primary image to dedupe against."""
    return url.split("/")[-1].split("?")[0].lower()


def main():
    limit = 3
    width = 800
    args = sys.argv[1:]
    if "--limit" in args:
        limit = int(args[args.index("--limit") + 1])
    if "--width" in args:
        width = int(args[args.index("--width") + 1])

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        artists = json.load(f)

    total_added = 0
    for i, a in enumerate(artists):
        name = a["name"]
        primary_key = normalize_primary(a.get("imageUrl", ""))
        print(f"[{i+1}/{len(artists)}] {name} ...", end=" ", flush=True)
        results = search_artworks(name, limit, width)
        # Dedupe against primary and each other
        seen = {primary_key}
        artworks = []
        for r in results:
            key = normalize_primary(r["imageUrl"])
            if key in seen:
                continue
            seen.add(key)
            artworks.append(r)
            if len(artworks) >= limit:
                break
        a["artworks"] = artworks
        total_added += len(artworks)
        print(f"+{len(artworks)} artworks")
        time.sleep(0.3)  # be polite to the API

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(artists, f, ensure_ascii=False, indent=2)

    print(f"\nDone. Added {total_added} artworks across {len(artists)} artists.")


if __name__ == "__main__":
    main()
