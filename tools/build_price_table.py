"""Official Jan Aushadhi Product & MRP list (CSV from janaushadhi.gov.in) -> compact price table for the coded tool.

    python tools/build_price_table.py data/janaushadhi_products_2026-11-12.csv
Writes price-desk/data/products.json and price-desk/tools/price_lookup.js (the bundle with the table inline).
"""
import csv
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "data" / "janaushadhi_products_2026-11-12.csv")
AS_OF = re.search(r"(\d{4}-\d{2}-\d{2})", SRC.name).group(1) if re.search(r"\d{4}-\d{2}-\d{2}", SRC.name) else ""

FORMS = ["tablet", "capsule", "syrup", "suspension", "injection", "cream", "ointment", "gel", "drops", "lotion",
         "inhaler", "powder", "solution", "spray", "sachet", "granules", "soap", "shampoo", "patch", "suppositor"]


def pack_count(unit: str) -> int | None:
    m = re.match(r"\s*(\d+)\s*'?s\b", unit.lower())
    return int(m.group(1)) if m else None


def form_of(name: str) -> str:
    n = name.lower()
    for f in FORMS:
        if f in n:
            return f
    return "other"


rows = []
with open(SRC, encoding="utf-8-sig", newline="") as fh:
    for r in csv.DictReader(fh):
        try:
            mrp = float(r["MRP"])
        except ValueError:
            continue
        if mrp <= 0:            # "Zero MRP products are under process" (site note)
            continue
        name = " ".join(r["Generic Name"].split())
        n = pack_count(r["Unit Size"])
        rows.append({
            "code": r["Drug Code"].strip(), "name": name, "pack": r["Unit Size"].strip(), "mrp": round(mrp, 2),
            "per_unit": round(mrp / n, 2) if n else None, "group": r["Group Name"].strip(), "form": form_of(name),
        })

out_dir = ROOT / "price-desk"
(out_dir / "data").mkdir(parents=True, exist_ok=True)
(out_dir / "tools").mkdir(parents=True, exist_ok=True)
meta = {"source": "Pharmaceuticals & Medical Devices Bureau of India (PMBI), Product & MRP List, janaushadhi.gov.in",
        "as_of": AS_OF, "count": len(rows)}
(out_dir / "data" / "products.json").write_text(json.dumps({"meta": meta, "products": rows}, ensure_ascii=False,
                                                           separators=(",", ":")), encoding="utf-8")

template = (ROOT / "tools" / "price_lookup.template.js").read_text(encoding="utf-8")
bundle = template.replace("/*__TABLE__*/[]", json.dumps(rows, ensure_ascii=False, separators=(",", ":"))) \
                 .replace("/*__META__*/{}", json.dumps(meta, ensure_ascii=False))
(out_dir / "tools" / "price_lookup.js").write_text(bundle, encoding="utf-8")
print(f"{len(rows)} products with MRP > 0 (as of {AS_OF}); bundle {len(bundle)//1024} KB")
