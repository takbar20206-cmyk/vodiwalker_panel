import 'package:flutter/foundation.dart';

/// یک رعدوبرق‌ِ ثبت‌شده.
@immutable
class LightningStrike {
  final double latitude;
  final double longitude;
  final DateTime time;
  final int energy; // index 0..100، میزان شدت
  final bool fromFeed; // آیا از feed واقعی آمده یا شبیه‌ساز
  final String source;

  const LightningStrike({
    required this.latitude,
    required this.longitude,
    required this.time,
    required this.energy,
    required this.fromFeed,
    required this.source,
  });

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
}

/// وضعیت کلی رصدِ رعدوبرق.
@immutable
class LightningSummary {
  final int strikes24h;
  final int strikesActive;
  final double maxDistanceKm;
  final List<LightningStrike> recent;
  final DateTime updated;
  final bool live;

  const LightningSummary({
    required this.strikes24h,
    required this.strikesActive,
    required this.maxDistanceKm,
    required this.recent,
    required this.updated,
    required this.live,
  });

  ///ระดับ تهدید 0..3.
  int get level =>
      strikesActive >= 40 ? 3 : strikesActive >= 18 ? 2 : strikesActive >= 6 ? 1 : 0;

  String get levelLabel => switch (level) {
        3 => 'پرخطور',
        2 => 'متوسط',
        1 => 'کم',
        _ => 'هیچ رعدوبرقی در حال ثبت نیست',
      };
}
