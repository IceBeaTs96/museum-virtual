#!/usr/bin/env python3
"""
Compute artist relations from existing metadata and write them into artists.json.

For each artist, derive a `relations` array of { id, name, type } where type is:
  - "movement": shares the same movement
  - "contemporary": overlapping lifetimes (birth/death years overlap)
  - "epoch": shares the same epoch (fallback when movement is too sparse)

Relations are deterministic and data-driven (no manual curation), so they can be
regenerated whenever the artist list changes.

Usage:
    python3 scripts/build_relations.py [--max N]
"""
import json
import sys

DATA_PATH = "data/artists.json"


def overlap(a, b):
    """Return True if two artists' lifetimes overlap."""
    if a.get("birthYear") is None or b.get("birthYear") is None:
        return False
    a_start = a["birthYear"]
    a_end = a.get("deathYear") or 9999
    b_start = b["birthYear"]
    b_end = b.get("deathYear") or 9999
    return a_start <= b_end and b_start <= a_end


def main():
    max_rel = 6
    if "--max" in sys.argv:
        max_rel = int(sys.argv[sys.argv.index("--max") + 1])

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        artists = json.load(f)

    by_id = {a["id"]: a for a in artists}

    for a in artists:
        rels = []
        seen = set()

        # 1. Same movement (strongest signal)
        for b in artists:
            if b["id"] == a["id"]:
                continue
            if b["movement"] == a["movement"]:
                rels.append({"id": b["id"], "name": b["name"], "type": "movement"})
                seen.add(b["id"])

        # 2. Overlapping lifetimes (contemporaries)
        for b in artists:
            if b["id"] == a["id"] or b["id"] in seen:
                continue
            if overlap(a, b):
                rels.append({"id": b["id"], "name": b["name"], "type": "contemporary"})
                seen.add(b["id"])

        # 3. Same epoch (fallback)
        for b in artists:
            if b["id"] == a["id"] or b["id"] in seen:
                continue
            if b["epoch"] == a["epoch"]:
                rels.append({"id": b["id"], "name": b["name"], "type": "epoch"})
                seen.add(b["id"])

        a["relations"] = rels[:max_rel]

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(artists, f, ensure_ascii=False, indent=2)

    total = sum(len(a.get("relations", [])) for a in artists)
    print(f"Done. Wrote relations for {len(artists)} artists ({total} total links).")


if __name__ == "__main__":
    main()
