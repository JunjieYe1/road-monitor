# -*- coding: utf-8 -*-
"""Parse demo.sql INSERT rows and list coordinates outside Hangzhou approximate bbox."""
import re
import sys

# WGS84 bounding box for Hangzhou municipality (approx., includes Chun'an, Jiande, Lin'an)
HZ_LON_MIN, HZ_LON_MAX = 118.05, 121.05
HZ_LAT_MIN, HZ_LAT_MAX = 29.80, 30.88


def parse_sql_tuple(s: str) -> list:
    s = s.strip().rstrip(";").strip()
    if s.startswith("("):
        s = s[1:-1]
    fields = []
    i = 0
    n = len(s)
    while i < n:
        while i < n and s[i].isspace():
            i += 1
        if i >= n:
            break
        if s[i : i + 4].upper() == "NULL":
            fields.append(None)
            i += 4
        elif s[i] == "'":
            i += 1
            buf = []
            while i < n:
                if s[i] == "'" and i + 1 < n and s[i + 1] == "'":
                    buf.append("'")
                    i += 2
                elif s[i] == "'":
                    i += 1
                    break
                else:
                    buf.append(s[i])
                    i += 1
            fields.append("".join(buf))
        else:
            j = i
            while i < n and s[i] != ",":
                i += 1
            fields.append(s[j:i])
        while i < n and s[i] == ",":
            i += 1
    return fields


def to_float(x):
    if x is None:
        return None
    if isinstance(x, str) and not x.strip():
        return None
    xs = str(x).strip().replace("\n", " ")
    try:
        return float(xs)
    except ValueError:
        return None


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else None
    if not path:
        print("Usage: python check_hangzhou_coords.py <demo.sql>")
        sys.exit(1)

    outside = []
    both_null = 0
    parse_err = []
    filled_lon = []
    filled_lat = []

    with open(path, "r", encoding="utf-8") as f:
        for lineno, line in enumerate(f, 1):
            if "INSERT INTO" not in line or "复测病害信息汇总表" not in line:
                continue
            m = re.search(r"VALUES\s*(\(.*\));\s*$", line, re.DOTALL)
            if not m:
                continue
            try:
                fields = parse_sql_tuple(m.group(1))
            except Exception as e:
                parse_err.append((lineno, str(e)))
                continue
            if len(fields) < 17:
                parse_err.append((lineno, f"field count {len(fields)}"))
                continue
            lon_s, lat_s = fields[15], fields[16]
            seq = fields[0]
            bh = fields[8]
            zone = fields[4]
            road = fields[9]
            lon, lat = to_float(lon_s), to_float(lat_s)
            if lon is None and lat is None:
                both_null += 1
                continue
            if lon is not None and lat is not None:
                filled_lon.append(lon)
                filled_lat.append(lat)
            if lon is None or lat is None:
                outside.append(
                    {
                        "line": lineno,
                        "seq": seq,
                        "bh": bh,
                        "zone": zone,
                        "road": road,
                        "lon": lon,
                        "lat": lat,
                        "reason": "lon_or_lat_null",
                    }
                )
                continue
            in_box = (
                HZ_LON_MIN <= lon <= HZ_LON_MAX and HZ_LAT_MIN <= lat <= HZ_LAT_MAX
            )
            if not in_box:
                reason = "outside_bbox"
                if 20 < lon < 35 and 100 < lat < 120:
                    reason = "likely_swapped_lon_lat"
                outside.append(
                    {
                        "line": lineno,
                        "seq": seq,
                        "bh": bh,
                        "zone": zone,
                        "road": road,
                        "lon": lon,
                        "lat": lat,
                        "reason": reason,
                    }
                )

    print(f"Hangzhou bbox: lon [{HZ_LON_MIN}, {HZ_LON_MAX}], lat [{HZ_LAT_MIN}, {HZ_LAT_MAX}]")
    print(f"Rows with both lon/lat NULL: {both_null}")
    print(f"Parse issues: {len(parse_err)}")
    print(f"Problem rows (outside box or partial): {len(outside)}")
    if filled_lon:
        print(
            f"LON filled: min {min(filled_lon):.6f} max {max(filled_lon):.6f} ({len(filled_lon)} rows)"
        )
    if filled_lat:
        print(
            f"LAT filled: min {min(filled_lat):.6f} max {max(filled_lat):.6f} ({len(filled_lat)} rows)\n"
        )

    for row in outside:
        print(
            f"line {row['line']}\tseq {row['seq']}\tbh {row['bh']}\t{row['zone']}\t{row['road']}\t"
            f"lon={row['lon']} lat={row['lat']}\t{row['reason']}"
        )


if __name__ == "__main__":
    main()
