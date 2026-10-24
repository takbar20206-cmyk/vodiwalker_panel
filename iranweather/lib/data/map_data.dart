import 'dart:convert';

import 'package:flutter/services/rootBundle.dart';

/// Lesen و normalize کردن GeoJSON استان‌های ایران برای نقاشیِ نقشه.
///
/// فایل `assets/maps/iran_provinces.geojson` حاصلِ[tools/build_assets.py] است
/// و ۳۱ استان را در قالب Polygon/MultiPolygon دارد.

/// یک contour استان.
class ProvinceContour {
  final String name;
  final String nameEn;
  final List<List<Offset>> rings;

  ProvinceContour({
    required this.name,
    required this.nameEn,
    required this.rings,
  });

  /// bounding box در canvas normalized [0..1].
  late final Rect normalizedBox;

  void computeBox(Offset topLeft, Size size) {
    double minX = double.infinity, minY = double.infinity;
    double maxX = -double.infinity, maxY = -double.infinity;
    for (final ring in rings) {
      for (final p in ring) {
        if (p.dx < minX) minX = p.dx;
        if (p.dx > maxX) maxX = p.dx;
        if (p.dy < minY) minY = p.dy;
        if (p.dy > maxY) maxY = p.dy;
      }
    }
    normalizedBox = Rect.fromLTWH(
        (minX - topLeft.dx) / size.width,
        (minY - topLeft.dy) / size.height,
        (maxX - minX) / size.width,
        (maxY - minY) / size.height);
  }
}

/// يافتن و normalize کردن GeoJSON استان‌های ایران.
class MapData {
  MapData._();

  static Future<List<ProvinceContour>> load() async {
    final text = await rootBundle.loadString('assets/maps/iran_provinces.geojson');
    final json = jsonDecode(text) as Map<String, dynamic>;
    final features = (json['features'] as List).cast<Map<String, dynamic>>();

    final out = <ProvinceContour>[];
    for (final f in features) {
      final props = Map<String, dynamic>.from(f['properties'] ?? {});
      final geometry = f['geometry'] as Map<String, dynamic>;
      out.add(
        ProvinceContour(
          name: (props['name'] as String?) ?? '',
          nameEn: (props['name_en'] as String?) ?? '',
          rings: _extractRings(geometry),
        ),
      );
    }
    return out;
  }

  static List<List<Offset>> _extractRings(Map<String, dynamic> geometry) {
    final type = geometry['type'] as String;
    if (type == 'Polygon') {
      return (geometry['coordinates'] as List)
          .map((r) => _ring((r as List).cast<List<num>>()))
          .toList(growable: false);
    }
    final polys = geometry['coordinates'] as List;
    return polys
        .expand((poly) => (poly as List)
            .map((r) => _ring((r as List).cast<List<num>>())))
        .toList(growable: false);
  }

  static List<Offset> _ring(List<List<num>> ring) {
    return ring.map((p) => Offset(p[0].toDouble(), p[1].toDouble())).toList();
  }
}
