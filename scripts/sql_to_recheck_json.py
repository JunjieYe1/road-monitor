# -*- coding: utf-8 -*-
"""Export 复测病害 rows with valid Hangzhou bbox coords to alertStore-compatible JSON."""
import argparse
import json
import re
import sys
from pathlib import Path

# Reuse parser from sibling module
_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from check_hangzhou_coords import (  # noqa: E402
    HZ_LAT_MAX,
    HZ_LAT_MIN,
    HZ_LON_MAX,
    HZ_LON_MIN,
    parse_sql_tuple,
    to_float,
)


def clean_disease_type(raw):
    """直接使用 SQL 病害类型字段，与业务分类一致。"""
    if raw is None:
        return "未分类"
    t = re.sub(r"\s+", " ", str(raw).replace("\n", " ")).strip()
    return t[:128] if t else "未分类"


def map_risk_to_severity(raw):
    if not raw:
        return "low"
    s = raw.strip().replace(" ", "").replace("\n", "")
    if re.search(r"Ⅲ|III|^3|三", s):
        return "high"
    if re.search(r"Ⅱ|II|^2|二", s):
        return "medium"
    return "low"


def map_status(raw):
    if not raw:
        return "pending"
    x = raw.strip().replace("\n", "")
    if any(k in x for k in ("已修复", "已完成", "销项", "无异常")):
        return "completed"
    if any(k in x for k in ("处理中", "评估中", "施工中")):
        return "processing"
    return "pending"


def shorten_time(raw):
    if not raw:
        return ""
    x = raw.strip().replace("\n", "")[:24]
    return x


def recheck_row_to_candidate(fields, lineno):
    if len(fields) < 21:
        return None
    lon_s, lat_s = fields[15], fields[16]
    lon, lat = to_float(lon_s), to_float(lat_s)
    if lon is None or lat is None:
        return None
    if not (
        HZ_LON_MIN <= lon <= HZ_LON_MAX and HZ_LAT_MIN <= lat <= HZ_LAT_MAX
    ):
        return None
    bh = (fields[8] or "").strip()
    district = (fields[4] or "").strip().replace("\n", " ")
    road = (fields[9] or "").strip().replace("\n", " ")
    dtype = fields[10]
    risk = fields[11]
    recheck_situation = fields[18] if len(fields) > 18 else ""
    recheck_time = fields[20] if len(fields) > 20 else ""
    fu_ce_order_raw = fields[26] if len(fields) > 26 else ""

    fu_ce_order = 0
    if fu_ce_order_raw and str(fu_ce_order_raw).strip().isdigit():
        fu_ce_order = int(str(fu_ce_order_raw).strip())

    detail = (dtype or "").strip()
    if recheck_situation:
        detail = f"{detail}｜复测：{str(recheck_situation).replace(chr(10), ' ')[:800]}"

    return {
        "_lineno": lineno,
        "_bh": bh,
        "_order": fu_ce_order,
        "lat": lat,
        "lng": lon,
        "district": district,
        "address": f"{bh} · {road}" if bh else road,
        "type": clean_disease_type(dtype),
        "severity": map_risk_to_severity(risk),
        "time": shorten_time(recheck_time) or "--",
        "status": map_status(recheck_situation),
        "description": detail[:1200],
    }


def dedupe_by_bh_latest(rows):
    """Keep one row per 编号 (_bh): largest 复测次序; tie-break larger line number."""
    by_bh = {}
    for r in rows:
        bh = r.get("_bh") or ""
        key = bh if bh else f"__pt_{r['lng']}_{r['lat']}__{r['_lineno']}"
        cur = by_bh.get(key)
        if cur is None:
            by_bh[key] = r
            continue
        if (r["_order"], r["_lineno"]) > (cur["_order"], cur["_lineno"]):
            by_bh[key] = r
    return list(by_bh.values())


def _lineno_safe(r: dict) -> int:
    return int(r.get("_lineno", 0))


def finalize_export_dicts(rows):
    rows = sorted(rows, key=lambda x: (_lineno_safe(x), x["lng"], x["lat"]))
    out = []
    for i, r in enumerate(rows, start=1):
        item = {
            "id": i,
            "lat": r["lat"],
            "lng": r["lng"],
            "type": r["type"],
            "severity": r["severity"],
            "district": r["district"],
            "address": r["address"],
            "time": r["time"],
            "status": r["status"],
        }
        if r.get("description"):
            item["description"] = r["description"]
        out.append(item)
    return out


def iter_inserts(sql_path: Path):
    with open(sql_path, "r", encoding="utf-8") as f:
        for lineno, line in enumerate(f, 1):
            if "INSERT INTO" not in line or "复测病害信息汇总表" not in line:
                continue
            m = re.search(r"VALUES\s*(\(.*\));\s*$", line, re.DOTALL)
            if not m:
                continue
            yield lineno, parse_sql_tuple(m.group(1))


def main():
    ap = argparse.ArgumentParser(
        description="Convert 复测病害 SQL dump to recheck-alerts.json"
    )
    ap.add_argument("sql_file", type=Path, help="Navicat dump .sql path")
    ap.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("public/data/recheck-alerts.json"),
        help="Output JSON path",
    )
    ap.add_argument(
        "--no-dedupe",
        action="store_true",
        help="Keep all rows including duplicate 编号 × 次序",
    )
    args = ap.parse_args()
    sql_file = args.sql_file
    out_path = args.output

    if not sql_file.is_file():
        print(f"File not found: {sql_file}", file=sys.stderr)
        sys.exit(1)

    raw_rows = []
    for lineno, fields in iter_inserts(sql_file):
        c = recheck_row_to_candidate(fields, lineno)
        if c:
            raw_rows.append(c)

    if not args.no_dedupe:
        raw_rows = dedupe_by_bh_latest(raw_rows)

    exported = finalize_export_dicts(raw_rows)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as wf:
        json.dump(exported, wf, ensure_ascii=False, indent=2)
        wf.write("\n")

    print(
        f"Wrote {len(exported)} alerts to {out_path.resolve()} "
        f"(bbox lon [{HZ_LON_MIN},{HZ_LON_MAX}] lat [{HZ_LAT_MIN},{HZ_LAT_MAX}])"
    )


if __name__ == "__main__":
    main()
