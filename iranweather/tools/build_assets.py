#!/usr/bin/env python3
"""
Asset pipeline for the "آیرانا" (Airana) Iran weather app.

Fetches public (key-less) datasets from GitHub and turns them into Flutter assets:

  1. assets/maps/iran_provinces.geojson  -> simplified 31-province boundary outline
  2. lib/data/cities.dart               -> 747 real Iranian cities (name, lat/lon, province)
  3. assets/icon/icon.png               -> generated app icon (pure-python PNG writer)

Run with:  python3 tools/build_assets.py
Only needs the Python standard library. Network access must reach api.github.com.

Dataset licences:
  * MrAlfak/List-of-provinces-and-cities-of-Iran  (GPL-3.0 for the data)
  * ssepehrnoush/Iran-geojson-map-boundaries     (see DATA-LICENSE.md in that repo)
  * rastikerdar/vazirmatn                         (SIL OFL 1.1)
"""

import json
import os
import re
import struct
import sys
import urllib.request
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = "/tmp/iranweather_assets"
os.makedirs(TMP, exist_ok=True)
for _d in ("assets/fonts", "assets/maps", "assets/icon", "lib/data"):
    os.makedirs(os.path.join(ROOT, _d), exist_ok=True)

CITIES_REPO = "MrAlfak/List-of-provinces-and-cities-of-Iran"
STATES_REPO = "ssepehrnoush/Iran-geojson-map-boundaries"

RTL_MARKS = dict.fromkeys(map(ord, ["\u200e", "\u200f", "\u200c", "\u200d", "\ufeff"]))


def clean(text):
    """Drop zero-width direction marks so Persian names round-trip cleanly."""
    return (text or "").translate(RTL_MARKS).strip()


def gh_raw(repo, path, dest):
    url = "https://api.github.com/repos/%s/contents/%s" % (repo, path)
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github.raw"})
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
        f.write(r.read())
    print("  fetched %-52s %8.1f KB" % (path, os.path.getsize(dest) / 1024))


# --------------------------------------------------------------------------- #
# 1. Douglas-Peucker simplification (no third-party deps)
# --------------------------------------------------------------------------- #
def perp_distance(p, a, b):
    ax, ay = a
    bx, by = b
    px, py = p
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    cx, cy = ax + t * dx, ay + t * dy
    return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5


def rdp(points, tolerance):
    if len(points) < 3:
        return points
    start, end = points[0], points[-1]
    index, best = -1, tolerance
    for i in range(1, len(points) - 1):
        d = perp_distance(points[i], start, end)
        if d > best:
            best, index = d, i
    if index == -1:
        return [start, end]
    left = rdp(points[: index + 1], tolerance)
    right = rdp(points[index:], tolerance)
    return left[:-1] + right


def quantize(value, digits=4):
    q = round(value, digits)
    return int(q * (10 ** digits)) / (10 ** digits)


def simplify_geometry(geom, tol=0.02):
    geom = json.loads(json.dumps(geom))
    if geom["type"] == "Polygon":
        return [simplify_ring(geom["coordinates"], tol) for geom_ring in [geom]]
    if geom["type"] == "MultiPolygon":
        return [[simplify_ring(r, tol) for r in poly] for poly in geom["coordinates"]]
    return geom


def simplify_ring(ring, tol):
    out = []
    for pt in rdp(ring, tol):
        out.append([quantize(pt[0]), quantize(pt[1])])
    if out and out[0] != out[-1]:
        out.append(out[0])
    return out


def build_province_map():
    print("== provinces map ==")
    src = os.path.join(TMP, "states.geojson")
    if not os.path.exists(src):
        gh_raw(STATES_REPO, "ir_states_boundaries_coordinates.geojson", src)
    raw = json.load(open(src))

    # Aggressive tolerance first, then re-try on the biggest ring if we are still fat.
    tol = 0.012
    feats = []
    for f in raw["features"]:
        props = {
            "name": clean(f["properties"].get("name")),
            "name_en": clean(f["properties"].get("name:en")),
        }
        geom = simplify_geometry(f["geometry"], tol)
        feats.append({"type": "Feature", "properties": props, "geometry": geom})

    payload = {"type": "FeatureCollection", "features": feats}
    blob = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    out = os.path.join(ROOT, "assets/maps/iran_provinces.geojson")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(blob)
    print("  %d provinces, %.1f KB written" % (len(feats), os.path.getsize(out) / 1024))
    return feats


# --------------------------------------------------------------------------- #
# 2. Cities
# --------------------------------------------------------------------------- #
def build_cities():
    print("== cities ==")
    src = os.path.join(TMP, "cities.geojson")
    if not os.path.exists(src):
        gh_raw(CITIES_REPO, "iran_cities.geojson", src)
    raw = json.load(open(src))

    rows = []
    seen = set()
    for f in raw["features"]:
        p = f["properties"]
        name = clean(p.get("name"))
        if not name or name in seen:
            continue
        seen.add(name)
        lon, lat = f["geometry"]["coordinates"]
        rows.append(
            {
                "id": p.get("id", len(rows)),
                "name": name,
                "en": clean(p.get("english_name")) or name,
                "lat": quantize(lat, 5),
                "lon": quantize(lon, 5),
                "province": clean(p.get("province")),
                "provinceEn": clean(p.get("province_english")),
                "county": clean(p.get("county")),
                "capital": bool(p.get("is_capital")),
                "phone": clean(p.get("phone_code")),
                "pop": p.get("population") or 0,
            }
        )

    rows.sort(key=lambda r: (-(1 if r["capital"] else 0), r["province"], r["name"]))

    out = os.path.join(ROOT, "lib/data/cities.dart")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(_CITIES_HEADER)
        fh.write("const List<Map<String, dynamic>> _RAW_CITIES = [\n")
        for r in rows:
            pop = r["pop"] if r["pop"] else 0
            fh.write(
                '  {id: %d, n: "%s", en: "%s", lat: %s, lng: %s, p: "%s", pe: "%s", '
                'c: "%s", cap: %s, ph: "%s", pop: %d},\n'
                % (
                    r["id"],
                    r["name"],
                    r["en"],
                    repr(r["lat"]),
                    repr(r["lon"]),
                    r["province"],
                    r["provinceEn"],
                    r["county"],
                    "true" if r["capital"] else "false",
                    r["phone"],
                    pop,
                )
            )
        fh.write("];\n\n")
        fh.write(_CITIES_BODY)
    print("  %d cities, %.1f KB written" % (len(rows), os.path.getsize(out) / 1024))
    return rows


_CITIES_HEADER = '''/// AUTO-GENERATED by tools/build_assets.py -- do not edit by hand.
/// Source: MrAlfak/List-of-provinces-and-cities-of-Iran (iran_cities.geojson)
/// License for the underlying data: GPL-3.0 (see that repository's DATA_LICENSE.md).
///
/// 747 real Iranian settlements with coordinates and province assignment,
/// so the app can list every city of Iran offline and resolve the closest one
/// to the device GPS without calling any geocoding service.

import 'package:iranweather/core/models/city.dart';

'''

_CITIES_BODY = '''
const List<Map<String, dynamic>> rawCities = _RAW_CITIES;

/// Every city the app knows about, alphabetically grouped by province.
List<City> get allCities => _RAW_CITIES.map((e) => City.fromJson(e)).toList(growable: false);

/// Provinces derived from the city list, each with its capital and centroid.
List<Province> get allProvinces {
  final map = <String, List<City>>{};
  for (final c in allCities) {
    map.putIfAbsent(c.province, () => []);
    map[c.province]!.add(c);
  }
  return map.entries
      .map((e) => Province(
            name: e.key,
            capital: (e.value.firstWhere(
                  (c) => c.capital,
                  orElse: () => e.value[0],
                )),
            cities: e.value,
          ))
      .toList()
      ..sort((a, b) => a.name.compareTo(b.name));
}

/// Fast search across Persian + English names and both scripts of the province.
List<City> searchCities(String query) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return [];
  return allCities
      .where((c) =>
          c.name.toLowerCase().contains(q) ||
          c.englishName.toLowerCase().contains(q) ||
          c.province.toLowerCase().contains(q) ||
          c.county.toLowerCase().contains(q))
      .take(40)
      .toList();
}
'''


# --------------------------------------------------------------------------- #
# 3. Icon (pure-python PNG)
# --------------------------------------------------------------------------- #
def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def png_write(path, pixels, size):
    """Write an RGBA PNG using only zlib + struct."""
    raw = bytearray()
    stride = size * 4
    for y in range(size):
        raw.append(0)
        raw.extend(pixels[y * stride:(y + 1) * stride])

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    with open(path, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", zlib.compress(bytes(raw), 9)))
        f.write(chunk(b"IEND", b""))


def build_icon():
    print("== icon ==")
    size = 512
    px = bytearray(size * size * 4)

    def put(x, y, c, a=255):
        if 0 <= x < size and 0 <= y < size:
            i = (y * size + x) * 4
            px[i] = c[0]
            px[i + 1] = c[1]
            px[i + 2] = c[2]
            px[i + 3] = a

    def ellipse(cx, cy, rx, ry, c, a=255, rot=0.0):
        cos_r, sin_r = _cos(rot), _sin(rot)
        steps = int(max(rx, ry) * 2.4)
        for i in range(steps):
            t = 2 * math.pi * i / steps
            x = cx + (rx * _cos(t) * cos_r - ry * _sin(t) * sin_r)
            y = cy + (rx * _cos(t) * sin_r + ry * _sin(t) * cos_r)
            x0, x1 = int(x - rx * 0.34), int(x + rx * 0.34)
            y0, y1 = int(y - ry * 0.34), int(y + ry * 0.34)
            for yy in range(max(0, y0), min(size, y1 + 1)):
                for xx in range(max(0, x0), min(size, x1 + 1)):
                    put(xx, yy, c, a)

    def disc(cx, cy, r, c, a=255):
        for y in range(size):
            for x in range(size):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    put(x, y, c, a)

    top = (11, 24, 54)
    mid = (20, 62, 120)
    low = (33, 108, 168)
    horizon = (255, 176, 84)
    sun = (255, 226, 138)
    cloud = (245, 250, 255)
    cloudEdge = (206, 222, 240)

    for y in range(size):
        t = y / size
        if t < 0.62:
            c = mix(top, mid, t / 0.62)
        elif t < 0.88:
            c = mix(mid, low, (t - 0.62) / 0.26)
        else:
            c = mix(low, horizon, (t - 0.88) / 0.12)
        for x in range(size):
            put(x, y, c)

    # warm horizon glow hugging the sunset
    ellipse(size * 0.62, size * 0.79, size * 0.55, size * 0.2, (255, 168, 72), a=70)
    ellipse(size * 0.62, size * 0.82, size * 0.42, size * 0.14, (255, 190, 96), a=70)

    # sun with halo
    disc(size * 0.66, size * 0.34, 96, (255, 226, 138))
    disc(size * 0.66, size * 0.34, 118, (255, 214, 120), a=40)

    # cloud silhouette (overlapping ellipses)
    parts = [
        (size * 0.30, size * 0.46, 0.17, 0.13),
        (size * 0.46, size * 0.42, 0.20, 0.15),
        (size * 0.58, size * 0.47, 0.16, 0.12),
        (size * 0.38, size * 0.56, 0.20, 0.12),
        (size * 0.52, size * 0.56, 0.22, 0.13),
    ]
    for (cx, cy, rx, ry) in parts:
        ellipse(cx, cy, size * rx, size * ry, cloud)
    ellipse(size * 0.66, size * 0.34, 118, 118, cloud, a=0)
    # soft shadow under cloud
    ellipse(size * 0.44, size * 0.70, size * 0.30, size * 0.09, (12, 32, 66), a=90)

    out = os.path.join(ROOT, "assets/icon/icon.png")
    png_write(out, px, size)
    print("  %.1f KB written" % (os.path.getsize(out) / 1024))


def _sin(x):
    return math.sin(x)


def _cos(x):
    return math.cos(x)


if __name__ == "__main__":
    import math  # noqa: E402

    if not os.path.exists(os.path.join(ROOT, "lib")):
        sys.exit("run this from the iranweather/ folder")
    build_province_map()
    build_cities()
    build_icon()
    print("done.")
