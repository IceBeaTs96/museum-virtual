#!/usr/bin/env python3
"""
Resolve all Wikimedia 'Special:FilePath' URLs to direct 'upload.wikimedia.org'
URLs in artists.json using the Wikimedia Commons API (reliable, no HEAD blocking).

Special:FilePath URLs trigger a 302->301->200 redirect chain that Three.js
TextureLoader sometimes fails to follow with CORS. Resolving them to the final
upload.wikimedia.org URL (which serves Access-Control-Allow-Origin: *) makes
texture loading reliable.

Usage:
    python3 scripts/resolve_image_urls.py [--width 1200]
"""
import json
import sys
import time
import urllib.parse
import urllib.request

DATA_PATH = "data/artists.json"
API = "https://commons.wikimedia.org/w/api.php"
UA = "MuseumVirtual/1.0 (educational art project; contact: admin@steffen-baltruschat.com)"


def filename_from_special(url):
    """Extract the File: name from a Special:FilePath URL (URL-decoded)."""
    if "Special:FilePath/" not in url:
        return None
    fn = url.split("Special:FilePath/")[-1]
    # URL-decode to get the real filename (e.g. %2C -> comma, %20 -> space)
    fn = urllib.parse.unquote(fn)
    return fn


def resolve_via_api(filename, width):
    """Return the direct upload.wikimedia.org thumburl for a File: name."""
    params = {
        "action": "query",
        "format": "json",
        "titles": "File:" + filename,
        "prop": "imageinfo",
        "iiprop": "url",
        "iiurlwidth": str(width),
    }
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.load(r)
    except Exception as e:
        print(f"  ! API error for {filename}: {e}", file=sys.stderr)
        return None
    pages = data.get("query", {}).get("pages", {})
    for p in pages.values():
        ii = p.get("imageinfo", [{}])[0]
        # Prefer thumburl (scaled, smaller) over full url
        return ii.get("thumburl") or ii.get("url")
    return None


def main():
    width = 1200
    if "--width" in sys.argv:
        width = int(sys.argv[sys.argv.index("--width") + 1])

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        artists = json.load(f)

    resolved = 0
    failed = 0
    for a in artists:
        # Primary image
        old = a.get("imageUrl", "")
        fn = filename_from_special(old)
        if fn:
            new = resolve_via_api(fn, width)
            if new and "upload.wikimedia.org" in new:
                a["imageUrl"] = new
                resolved += 1
            else:
                failed += 1
            time.sleep(0.15)
        # Artworks
        for w in a.get("artworks", []):
            wu = w.get("imageUrl", "")
            wfn = filename_from_special(wu)
            if wfn:
                new = resolve_via_api(wfn, width)
                if new and "upload.wikimedia.org" in new:
                    w["imageUrl"] = new
                    resolved += 1
                else:
                    failed += 1
                time.sleep(0.15)

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(artists, f, ensure_ascii=False, indent=2)

    print(f"Done. Resolved {resolved} URLs, {failed} failed (kept original).")


if __name__ == "__main__":
    main()
