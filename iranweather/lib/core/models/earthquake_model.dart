import 'package:flutter/foundation.dart';

/// یک زلزلهٔ recorded.
@immutable
class Earthquake {
  final String id;
  final double magnitude;
  final double latitude;
  final double longitude;
  final DateTime time;
  final String place;
  final String placeEn;
  final double depth; // کیلومتر
  final String network;

  const Earthquake({
    required this.id,
    required this.magnitude,
    required this.latitude,
    required this.longitude,
    required this.time,
    required this.place,
    required this.placeEn,
    required this.depth,
    required this.network,
  });

  factory Earthquake.fromJson(Map<String, dynamic> json) => Earthquake(
        id: json['id'].toString(),
        magnitude: (json['properties']['mag'] as num?)?.toDouble() ?? 0,
        latitude: (json['geometry']['coordinates'][1] as num).toDouble(),
        longitude: (json['geometry']['coordinates'][0] as num).toDouble(),
        time: DateTime.fromMillisecondsSinceEpoch(
            (json['properties']['time'] as num).toInt()),
        place: (json['properties']['place'] as String?) ?? '',
        placeEn: (json['properties']['place'] as String?) ?? '',
        depth: (json['geometry']['coordinates'][2] as num?)?.toDouble() ?? 0,
        network: (json['properties']['felt'] != null
                ? (json['properties']['source'] as String?) ?? 'unknown'
                : (json['properties']['source'] as String?) ?? 'unknown'),
      );

  double get depthKm => depth < 1 ? 0 : depth;

  /// رتبه‌ی خطر بر اساس بزرگی ریخته‌ساختاری.
  String get severityLabel {
    if (magnitude >= 8) return 'بزرگ';
    if (magnitude >= 7) return 'خيلي besar';
    if (magnitude >= 6) return 'قوى';
    if (magnitude >= 5) return 'متوسط';
    if (magnitude >= 4) return 'به‌اندازه';
    return 'کم';
  }

  /// رنگسازی بنا بر بزرگی.
  Color? get severityColor => switch (magnitude) {
        >= 8 => const Color(0xFFFF3B3B),
        >= 7 => const Color(0xFFFF6B00),
        >= 6 => const Color(0xFFFF9500),
        >= 5 => const Color(0xFFFFC400),
        >= 4 => const Color(0xFFFFE557),
        _ => const Color(0xFF6EC5FF),
      };

  /// فاصله از یک نقطه (کیلومتر).
  double distanceKmFrom(double lat, double lng) {
    const r = 6371.0;
    final dLat = _rad(lat - latitude);
    final dLng = _rad(lng - longitude);
    final a =
        sin(dLat / 2) * sin(dLat / 2) +
            cos(_rad(latitude)) * cos(_rad(lat)) * sin(dLng / 2) * sin(dLng / 2);
    return 2 * r * asin((sqrt(a)).clamp(0.0, 1.0));
  }

  static double _rad(double d) => d * 3.141592653589793 / 180.0;

  static String fmtTime(DateTime t) {
    final h = t.hour.toString().padLeft(2, '0');
    final m = t.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}
