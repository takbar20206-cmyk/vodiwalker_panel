import 'dart:async';

import 'package:iranweather/core/models/earthquake_model.dart';
import 'package:iranweather/core/network/api_client.dart';

/// سرویس زلزله: دو منبع آزاد و key‌بنشدنی.
///
///  * **USGS** — Earthquake Hazards Program، global، `format=geojson`
///  * **EMSC** — European-Mediterranean Seismological Centre
///
/// هر دو آزاد و key‌بنشدنی هستند؛ USGS اصلی و EMSC پشتیبان.
class EarthquakeService {
  EarthquakeService._();

  static Future<List<Earthquake>> recent({
    double? minMagnitude,
    int limit = 150,
  }) async {
    final since = DateTime.now().subtract(const Duration(days: 14));
    final usgs = await _usgs(
        since: since, minMagnitude: minMagnitude ?? 3.0, limit: limit);
    if (usgs.isNotEmpty) return usgs;
    return _emsc(since: since, minMagnitude: minMagnitude ?? 3.0, limit: limit);
  }

  static Future<List<Earthquake>> worldwide({int limit = 100}) async {
    final usgs = await _usgs(
        since: DateTime.now().subtract(const Duration(days: 7)),
        minMagnitude: 4.5,
        limit: limit);
    return usgs;
  }

  static Future<List<Earthquake>> _usgs({
    required DateTime since,
    double minMagnitude = 3,
    int limit = 150,
  }) async {
    final body = await ApiClient.getJson(
      '$ApiClient.usgs/fdsnws/event/1/query',
      query: <String, String>{
        'format': 'geojson',
        'starttime': since.toIso8601String(),
        'endtime': DateTime.now().toIso8601String(),
        'minmagnitude': minMagnitude.toStringAsFixed(1),
        'limit': '$limit',
        'orderby': 'time-asc',
      },
      retries: 2,
    );
    final feats = (body['features'] as List?)?.cast<Map<String, dynamic>>() ??
        const [];
    return feats
        .map((f) => Earthquake.fromJson(f))
        .where((e) => e.latitude > 22 && e.latitude < 42 && e.longitude > 42 && e.longitude < 65)
        .toList();
  }

  static Future<List<Earthquake>> _emsc({
    required DateTime since,
    double minMagnitude = 3,
    int limit = 150,
  }) async {
    final body = await ApiClient.getJson(
      '$ApiClient.emsc/fdsnws/event/1/query',
      query: <String, String>{
        'format': 'geojson',
        'starttime': since.toIso8601String(),
        'endtime': DateTime.now().toIso8601String(),
        'minmagnitude': minMagnitude.toStringAsFixed(1),
        'limit': '$limit',
        'orderby': 'time-asc',
      },
    );
    final feats = (body['features'] as List?)?.cast<Map<String, dynamic>>() ??
        const [];
    return feats
        .map((f) => Earthquake.fromJson(f))
        .where((e) => e.latitude > 22 && e.latitude < 42 && e.longitude > 42 && e.longitude < 65)
        .toList();
  }

  /// بزرگترین زلزلهٔ اخیر در radius کیلومتر از نقطه.
  static Earthquake? nearest(List<Earthquake> quakeList, double lat, double lng) {
    if (quakeList.isEmpty) return null;
    Earthquake? best;
    var bestDist = double.infinity;
    for (final q in quakeList) {
      final d = q.distanceKmFrom(lat, lng);
      if (d < bestDist) {
        bestDist = d;
        best = q;
      }
    }
    return best;
  }
}
