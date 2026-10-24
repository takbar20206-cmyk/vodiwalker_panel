import 'dart:async';

import 'package:geolocator/geolocator.dart';

import 'package:iranweather/core/models/city.dart';
import 'package:iranweather/data/cities.dart';

/// موقعیت دستگاه و پیدا کردن نزدیک‌ترین شهر ایران.
///
/// اگر اجازهٔ مکان داده شد، نقطه‌ی GPS با نزدیک‌ترین شهر از لیستِ داخلی
/// (۷۳۸ شهر) Match می‌شود — بدون هیچ سرویسِ geocoding و بدون key.
class LocationService {
  LocationService._();

  /// موقعیت جاری، با fallback به تهران در صورتِ عدم دسترسی.
  static Future<({double lat, double lng, City? city, bool precise})> current() async {
    try {
      final position = await _resolvePosition();
      if (position != null) {
        return (
          lat: position.latitude,
          lng: position.longitude,
          city: nearestCityTo(position.latitude, position.longitude),
          precise: true,
        );
      }
    } catch (_) {
      // place well-known default
    }
    return (lat: teheran.lat, lng: teheran.lng, city: teheran, precise: false);
  }

  static Future<Position?> _resolvePosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return null;

    LocationPermission permission = await Geolocator.checkLocationPermission();
    if (permission == LocationPermission.denied) {
      final granted = await Geolocator.requestLocationPermission();
      if (granted != LocationPermission.granted) return null;
    } else if (permission == LocationPermission.deniedForever) {
      return null;
    }

    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
      timeLimit: const Duration(seconds: 14),
    );
  }

  /// نزدیک‌ترین شهر از داده‌ی داخلی به یک نقطه.
  static City? nearestCityTo(double lat, double lng) {
    City? best;
    var bestD = double.infinity;
    for (final c in allCities) {
      final d = c.distanceTo(lat, lng);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  /// فاصله یک نقطه تا نزدیک‌ترین شهر (کیلومتر).
  static double distanceToNearestCity(double lat, double lng) {
    final c = nearestCityTo(lat, lng);
    return c == null ? 0 : c.distanceTo(lat, lng);
  }

  /// دسته‌بندی شهرها بر اساس استان، برای لیست.
  static List<List<City>> groupedByProvince() {
    final map = <String, List<City>>{};
    for (final c in allCities) {
      map.putIfAbsent(c.province, () => []);
      map[c.province]!.add(c);
    }
    return map.values
        .toList()
        ..sort((a, b) => a.first.province.compareTo(b.first.province));
  }
}
