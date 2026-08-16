#!/usr/bin/env python3
"""
Repair broken image URLs in artists.json with VERIFIED correct filenames.

The 30 'Special:FilePath/..._Google_Art_Project.jpg' URLs point to files that
no longer exist on Wikimedia Commons (HTTP 404). This script replaces them with
verified, existing File: titles resolved to direct upload.wikimedia.org URLs.

The mapping below was hand-verified against the Commons search API. For
copyright-protected artists (post-1900), the best freely-available image is
used (often a reproduction or exhibition photo); for pre-1900 artists, the
high-resolution original is used.

Usage:
    python3 scripts/repair_image_urls.py [--dry-run]
"""
import json
import sys
import time
import urllib.parse
import urllib.request

DATA_PATH = "data/artists.json"
API = "https://commons.wikimedia.org/w/api.php"
UA = "MuseumVirtual/1.0 (educational art project; contact: admin@steffen-baltruschat.com)"

# Verified correct File: titles (hand-checked against Commons search)
# Key = artist name (exact match in artists.json), Value = File: title
CORRECT_FILES = {
    "Jan van Eyck": "File:Van Eyck - Arnolfini Portrait.jpg",
    "Albrecht Dürer": "File:Albrecht Dürer - 1500 self-portrait (High resolution and detail).jpg",
    "Caravaggio": "File:Supper at Emmaus-Caravaggio (1601).jpg",
    "Rembrandt van Rijn": "File:The Nightwatch by Rembrandt - Rijksmuseum.jpg",
    "Johannes Vermeer": "File:Johannes Vermeer (1632-1675) - The Girl With The Pearl Earring (1665).jpg",
    "Gian Lorenzo Bernini": "File:Ecstasy of Saint Teresa September 2015-2a.jpg",
    "Artemisia Gentileschi": "File:Artemisia Gentileschi - Judith Beheading Holofernes - WGA8563.jpg",
    "Caspar David Friedrich": "File:Caspar David Friedrich - Wanderer above the sea of fog.jpg",
    "J. M. W. Turner": "File:The Fighting Temeraire, JMW Turner, National Gallery.jpg",
    "Georges Seurat": "File:A Sunday on La Grande Jatte, Georges Seurat, 1884.jpg",
    "Utagawa Hiroshige": "File:Hiroshige, Sudden shower over Shin-Ōhashi bridge and Atake, 1857.jpg",
    # Copyright-protected (best available free image)
    "Pierre-Auguste Renoir": "File:Renoir, Pierre-Auguste - Dance at Le Moulin de la Galette, 1876.jpg",
    "Gustav Klimt": "File:The Kiss - Gustav Klimt - Google Cultural Institute.jpg",
    "Pablo Picasso": "File:Pablo Picasso's Guernica.jpg",
    "Wassily Kandinsky": "File:Kandinsky - Composition 8, July 1923.jpg",
    "Salvador Dalí": "File:Dargenta & Salvador Dali The persistance of Memory.png",
    "Frida Kahlo": "File:Frida Kahlo Diego Rivera 1932.jpg",
    "Henri Matisse": "File:Matisse - Carra, 467.jpg",
    "Piet Mondrian": "File:Piet Mondriaan - Composition with large red plane, black, blue, yellow and gray - B120 - Piet Mondrian, catalogue raisonné.jpg",
    "Georgia O'Keeffe": "File:Oriental Poppies by Georgia O’Keeffe.jpg",
    "Andy Warhol": "File:Marilyn Monroe Illusion.jpg",
    "Jackson Pollock": "File:Lavande Mist, Pollock, NGA Washington 1950.png",
    "Mark Rothko": "File:A galley of paintings by Mark Rothko, Tate Modern.jpg",
    "Yayoi Kusama": "File:Yayoi Kusama Obliteration Room.jpg",
    "Banksy": "File:The World of Banksy 2022, Brussels.jpg",
    "Gerhard Richter": "File:Gerhard Richter, Abstract Pictures, SFMOMA 06.jpg",
    "Edward Hopper": "File:Nighthawks by Edward Hopper 1942.jpg",
    "René Magritte": "File:The Treachery of Images (6343745911).jpg",
    "David Hockney": "File:Looking at Hockney (2) - geograph.org.uk - 7677637.jpg",
    "Jean-Michel Basquiat": "File:Graffiti Jean-Michel Basquiat Eme Freethinker Pen Chill Mauerpark Berlin-Prenzlauer Berg.jpg",
}


def get_thumburl(file_title, width=1200):
    """Return direct upload.wikimedia.org thumburl for a File: title."""
    params = {
        "action": "query", "format": "json", "titles": file_title,
        "prop": "imageinfo", "iiprop": "url", "iiurlwidth": str(width),
    }
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                data = json.load(r)
            for p in data.get("query", {}).get("pages", {}).values():
                ii = p.get("imageinfo", [{}])[0]
                return ii.get("thumburl") or ii.get("url")
            return None
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(2 * (attempt + 1))
                continue
            return None
        except Exception:
            return None
    return None


def main():
    dry_run = "--dry-run" in sys.argv

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        artists = json.load(f)

    fixed = 0
    failed = 0
    for a in artists:
        name = a.get("name", "")
        if name not in CORRECT_FILES:
            continue
        file_title = CORRECT_FILES[name]
        thumb = get_thumburl(file_title)
        if thumb and "upload.wikimedia.org" in thumb:
            if not dry_run:
                a["imageUrl"] = thumb
            print(f"  ✓ {name:28s} -> {file_title}")
            fixed += 1
        else:
            print(f"  ! {name:28s} -> FAILED ({file_title})", file=sys.stderr)
            failed += 1
        time.sleep(0.3)

    if not dry_run:
        with open(DATA_PATH, "w", encoding="utf-8") as f:
            json.dump(artists, f, ensure_ascii=False, indent=2)

    print(f"\nDone. Fixed {fixed}, failed {failed}." + (" (dry-run)" if dry_run else ""))


if __name__ == "__main__":
    main()
