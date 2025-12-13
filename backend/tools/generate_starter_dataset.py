"""Generate a synthetic starter Indo↔Banjar dataset.

This is meant for testing the pipeline only.
Replace it with real parallel data for quality.

Usage:
  python tools/generate_starter_dataset.py --out data/dataset.csv --rows 800
"""

from __future__ import annotations

import argparse
import csv
import random
from pathlib import Path

ID_TO_BANJAR = {
    "saya": "ulun",
    "aku": "ulun",
    "anda": "pian",
    "kamu": "pian",
    "tidak": "kada",
    "mau": "handak",
    "ingin": "handak",
    "pergi": "tulak",
    "pulang": "mulih",
    "tolong": "tulung",
    "bagaimana": "kayapa",
    "apa": "napa",
    "terima": "matur",
    "kasih": "kasih",
    "sekarang": "wayahini",
    "nanti": "kaina",
    "dimana": "di mana",
    "ke": "ka",
}

# Reverse mapping for the synthetic dataset
BANJAR_TO_ID = {v: k for k, v in ID_TO_BANJAR.items()}

TEMPLATES = [
    "Apa kabar?",
    "Bagaimana kabarmu?",
    "Saya tidak tahu.",
    "Tolong bantu saya.",
    "Terima kasih.",
    "Saya mau pergi sekarang.",
    "Kamu mau pergi ke mana?",
    "Saya ingin makan.",
    "Saya ingin minum.",
    "Saya tidak mau pulang.",
    "Kamu tidak mau ikut?",
    "Saya mau belajar.",
    "Saya mau bekerja.",
    "Kamu mau makan apa?",
    "Kamu mau minum apa?",
    "Saya pergi ke rumah.",
    "Saya pergi ke sekolah.",
    "Saya pergi ke pasar.",
    "Saya tidak punya uang.",
    "Saya sudah makan.",
    "Saya belum makan.",
    "Kita pergi nanti.",
]


def word_replace(sentence: str, mapping: dict[str, str]) -> str:
    out = sentence
    # Replace longest words first to reduce partial overlaps.
    for src in sorted(mapping.keys(), key=len, reverse=True):
        dst = mapping[src]
        out = out.replace(src, dst)
        out = out.replace(src.capitalize(), dst)
        out = out.replace(src.upper(), dst)
    return out


def build_pairs(n: int) -> list[tuple[str, str, str]]:
    rows: list[tuple[str, str, str]] = []
    for _ in range(n):
        src = random.choice(TEMPLATES)
        ban = word_replace(src.lower(), ID_TO_BANJAR)
        # Normalize simple casing
        ban = ban.strip()
        if ban:
            ban = ban[0].lower() + ban[1:]
        rows.append((src, ban, "id-to-banjar"))
        rows.append((ban, src, "banjar-to-id"))
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/dataset.csv")
    ap.add_argument("--rows", type=int, default=800, help="approximate number of direction-pairs")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    random.seed(args.seed)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    pairs = build_pairs(max(1, args.rows // 2))

    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["source", "target", "direction"])
        for s, t, d in pairs:
            w.writerow([s, t, d])

    print(f"Wrote {len(pairs)} rows to {out}")


if __name__ == "__main__":
    main()
