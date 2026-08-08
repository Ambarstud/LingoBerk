#!/usr/bin/env python3
"""
LingoBerk — Anki deste içe aktarma scripti.

'kelime destesi/' klasöründeki iki .apkg (Anki paketi) dosyasını okur,
temizler, tekilleştirir ve mevcut data/yds-words.json ile birleştirir.

Özellikler:
- İki kez çalıştırınca kartları İKİYE KATLAMAZ (english alanına göre tekillik).
- Elle hazırlanmış mevcut 350 kelime KORUNUR (id/örnek/etiketleri değişmez).
- HTML entity'leri (&#x27; &nbsp; vb.) ve etiketleri temizler.
- Zengin deste (seviye + örnek) çakışmalarda tercih edilir.

Çalıştırma:  python3 scripts/import-deck.py
"""
import html
import json
import os
import re
import sqlite3
import tempfile
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECK_DIR = os.path.join(ROOT, "kelime destesi")
OUT = os.path.join(ROOT, "data", "yds-words.json")

# Zengin deste (CEFR seviye + Türkçe + örnek cümle)
DECK_RICH = "_YDT_YDS_Tam_Kelime_Listesi_2026_Deste__PDF.apkg"
# Geniş deste (sadece Türkçe anlam)
DECK_WIDE = "_YDTYDS_TM_KELMELER__3000_Kelime_Listesi.apkg"

SEP = "\x1f"  # Anki alan ayıracı
VALID_LEVELS = {"A2", "B1", "B2", "C1"}
LEVEL_MAP = {"A1": "A2", "A2": "A2", "B1": "B1", "B2": "B2", "C1": "C1", "C2": "C1"}


def clean(text: str) -> str:
    """HTML etiket/entity temizle, boşlukları düzenle."""
    if not text:
        return ""
    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", " ", text)  # <div>, <br> vb.
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    text = text.strip('"').strip()
    return text


def read_notes(apkg_path: str):
    """Bir .apkg dosyasını aç, notların alanlarını (flds) döndür."""
    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(apkg_path) as z:
            # Yeni Anki 'collection.anki21', eskisi 'collection.anki2'
            name = "collection.anki21" if "collection.anki21" in z.namelist() else "collection.anki2"
            z.extract(name, tmp)
            db = os.path.join(tmp, name)
        con = sqlite3.connect(db)
        rows = [r[0] for r in con.execute("SELECT flds FROM notes")]
        con.close()
    return rows


def parse_rich(flds: str):
    """'kelime \x1f LEVEL - türkçe - örnek1 / örnek2' -> (word, tr, example, level)"""
    parts = flds.split(SEP)
    if len(parts) < 2:
        return None
    word = clean(parts[0])
    body = clean(parts[1])
    # LEVEL - türkçe - örnekler
    m = re.match(r"^(A1|A2|B1|B2|C1|C2)\s*-\s*(.*?)\s*-\s*(.*)$", body)
    if m:
        level, tr, ex = m.group(1), m.group(2), m.group(3)
    else:
        m2 = re.match(r"^(A1|A2|B1|B2|C1|C2)\s*-\s*(.*)$", body)
        if m2:
            level, tr, ex = m2.group(1), m2.group(2), ""
        else:
            level, tr, ex = "B2", body, ""
    tr = tr.replace(" / ", ", ").strip(" ,")
    example = ex.split(" / ")[0].strip() if ex else ""
    return word, tr, example, LEVEL_MAP.get(level, "B2")


def parse_wide(flds: str):
    """'kelime \x1f türkçe anlamlar' -> (word, tr)"""
    parts = flds.split(SEP)
    if len(parts) < 2:
        return None
    word = clean(parts[0])
    tr = clean(parts[1]).replace(" / ", ", ").strip(" ,")
    return word, tr


def slug(word: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", word.lower()).strip("-")


def main():
    # 1) Mevcut elle hazırlanmış kartları oku (korunacak)
    with open(OUT, encoding="utf-8") as f:
        existing = json.load(f)
    existing_words = {e["english"].strip().lower() for e in existing}
    print(f"Mevcut kelime (korunacak): {len(existing)}")

    # 2) Zengin desteyi oku
    new_entries = {}  # english_lower -> entry
    skipped_empty = 0

    for flds in read_notes(os.path.join(DECK_DIR, DECK_RICH)):
        p = parse_rich(flds)
        if not p:
            continue
        word, tr, example, level = p
        key = word.lower()
        if not word or not tr:
            skipped_empty += 1
            continue
        if key in existing_words or key in new_entries:
            continue
        new_entries[key] = {
            "english": word,
            "turkish": tr,
            "example": example,
            "category": "yds",
            "difficulty": level,
            "tags": ["imported", "exam"] + ([] if example else ["no-example"]),
        }

    rich_count = len(new_entries)
    print(f"Zengin desteden eklenen: {rich_count}")

    # 3) Geniş desteyi oku (sadece zaten olmayanları)
    for flds in read_notes(os.path.join(DECK_DIR, DECK_WIDE)):
        p = parse_wide(flds)
        if not p:
            continue
        word, tr = p
        key = word.lower()
        if not word or not tr:
            skipped_empty += 1
            continue
        if key in existing_words or key in new_entries:
            continue
        new_entries[key] = {
            "english": word,
            "turkish": tr,
            "example": "",
            "category": "yds",
            "difficulty": "B2",
            "tags": ["imported", "no-example"],
        }

    wide_count = len(new_entries) - rich_count
    print(f"Geniş desteden eklenen: {wide_count}")

    # 4) Kararlı id ver ve alfabetik sırala
    seen_ids = set()
    merged_new = []
    for key in sorted(new_entries.keys()):
        entry = new_entries[key]
        base = f"imp-{slug(entry['english'])}"
        cid = base
        i = 2
        while cid in seen_ids:
            cid = f"{base}-{i}"
            i += 1
        seen_ids.add(cid)
        merged_new.append({"id": cid, **entry})

    result = existing + merged_new

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print("-" * 40)
    print(f"Toplam kelime      : {len(result)}")
    print(f"  - Korunan (elle) : {len(existing)}")
    print(f"  - Yeni eklenen   : {len(merged_new)}")
    print(f"Atlanan (boş)      : {skipped_empty}")
    print(f"Yazıldı            : {OUT}")


if __name__ == "__main__":
    main()
