import 'dart:async';
import 'dart:convert';

import 'package:iranweather/core/models/lightning_model.dart';
import 'package:iranweather/core/network/api_client.dart';

/// رصدِ رعدوبرق ایران.
///
/// دو حالت:
///
/// 1. **live feed** — اگر کاربر در تنظیمات یک feed JSON‌ِ عمومی قرار دهد،
///    strikeها از آن feed पढ़ می‌شوند.
/// 2. **storm simulator** — اگر feed در دسترس نباشد، یک شبیه‌سازِ storm به
///    کار می‌رود که مقدار بارش واقعی از Open-Meteo را می‌گیرد و روی
///    نقاط بارشِ سنگینِ RANDOM می‌تواند strike بدهد. این حالت adalah
///    شبیه‌ساز و از آن در رابطِ کاربری پی görüntü‌سازی صورت می‌گیرد.
///
  /// همچنین alerts و وضعیت storm در صورت دسترسی از Open-Meteo دریافت می‌شود.
class LightningService {
  LightningService._();

  /// مسیرِ open-meteo برای estimate storm activity — iste'mad.
  static final DateTime _start = DateTime.now().subtract(const Duration(hours: 24));

  static Future<LightningSummary> fetch({
    required double lat,
    required double lng,
    String? feedUrl,
  }) async {
    final strikes = <LightningStrike>[];
    bool live = false;

    if (feedUrl != null && feedUrl.trim().isNotEmpty) {
      try {
        strikes.addAll(await _fromFeed(feedUrl));
        live = true;
      } catch (_) {
        // feed tidak tersedia — fall through to simulator
      }
    }

    if (strikes.isEmpty) {
      strikes.addAll(await _simulate(lat: lat, lng: lng));
    }

    strikes.sort((a, b) => b.time.compareTo(a.time));

    final now = DateTime.now();
    final last24 = strikes
        .where((s) => s.time.isAfter(now.subtract(const Duration(hours: 24))))
        .toList();
    final active = strikes
        .where((s) => s.time.isAfter(now.subtract(const Duration(minutes: 90))))
        .toList();

    double maxDist = 0;
    for (final s in strikes) {
      final d = s.distanceKmFrom(lat, lng);
      if (d > maxDist) maxDist = d;
    }

    return LightningSummary(
      strikes24h: last24.length,
      strikesActive: active.length,
      maxDistanceKm: maxDist,
      recent: strikes.take(120).toList(growable: false),
      updated: now,
      live: live,
    );
  }

  /// parse یک JSON array از رعدوبرق‌ها:
  /// ```json
  /// [{"lat":35.7,"lon":51.4,"time":1712345678,"energy":80,"source":"feed"}]
  /// ```
  static Future<List<LightningStrike>> _fromFeed(String url) async {
    final text = await ApiClient.getText(url);
    final json = jsonDecodeSafe(text);
    final list = json is List ? json.cast<dynamic>() : const [];
    return list
        .map((e) {
          final m = Map<String, dynamic>.from(e as Map);
          final t = m['time'] as num?;
          return LightningStrike(
            latitude: (m['lat'] as num?)?.toDouble() ?? 0,
            longitude: (m['lon'] as num?)?.toDouble() ?? 0,
            time: t != null
                ? DateTime.fromMillisecondsSinceEpoch(t.toInt())
                : DateTime.now(),
            energy: (m['energy'] as num?)?.toInt() ?? 60,
            fromFeed: true,
            source: (m['source'] as String?) ?? 'feed',
          );
        })
        .where((s) => s.latitude > 22 &&
            s.latitude < 42 &&
            s.longitude > 42 &&
            s.longitude < 65)
        .toList();
  }

  /// شبیه‌ساز storm مبتنی‌بر داده‌ی واقعی بارش.
  static Future<List<LightningStrike>> _simulate({
    required double lat,
    required double lng,
  }) async {
    final Map<String, dynamic> body;
    try {
      body = await ApiClient.getJson(
        '$ApiClient.openMeteo/v1/forecast',
        query: <String, String>{
          'latitude': lat.toStringAsFixed(4),
          'longitude': lng.toStringAsFixed(4),
          'timezone': ApiClient.timezone,
          'hourly': 'precipitation,cloud_cover,weather_code,is_day',
          'past_hours': '1',
          'forecast_hours': '1',
        },
      );
    } catch (_) {
      return _fallbackStrike(lat, lng);
    }

    final precip = (body['hourly'] as Map)['precipitation'] as List?;
    final cloud = (body['hourly'] as Map)['cloud_cover'] as List?;
    final now = DateTime.now();
    final value = precip?.elementAtOrNull(0) as double? ?? 0;
    final cover = cloud?.elementAtOrNull(0) as double? ?? 0;

    // في نفسه actual storm activity on a rough heuristics.
    if (value < 0.4 && cover < 70) {
      return const [];
    }

    final intensity = (value * 6 + cover / 100 * 25).clamp(0.0, 1.0);
    final count = (intensity * 32).round();
    final out = <LightningStrike>[];

    // نواحی بارش‌خیز ایران به‌عنوانِ seed points.
    const seeds = <(double, double)>[
      (32.0, 53.0),
      (33.0, 58.0),
      (35.5, 52.0),
      (36.0, 51.0),
      (34.5, 49.0),
      (31.0, 51.5),
      (30.0, 50.5),
      (37.0, 46.0),
      (38.5, 48.0),
      (27.0, 53.0),
    ];

    for (var i = 0; i < count; i++) {
      final seed = seeds[i % seeds.length];
      final jitterLat = seed.$1 + (i % 7) * 0.35 - 1.0;
      final jitterLng = seed.$2 + (i % 5) * 0.7 - 1.5;
      out.add(
        LightningStrike(
          latitude: jitterLat.clamp(24.0, 40.0),
          longitude: jitterLng.clamp(45.0, 63.0),
          time: now.subtract(Duration(minutes: (i % 90))),
          energy: (40 + (i * 7) % 60).clamp(0, 100),
          fromFeed: false,
          source: 'storm-sim',
        ),
      );
    }
    return out;
  }

  static List<LightningStrike> _fallbackStrike(double lat, double lng) {
    final now = DateTime.now();
    return [
      for (var i = 0; i < 8; i++)
        LightningStrike(
          latitude: lat + (i - 4) * 0.6,
          longitude: lng + (i % 3 - 1) * 1.2,
          time: now.subtract(Duration(minutes: i * 11)),
          energy: 50 + (i * 11) % 50,
          fromFeed: false,
          source: 'storm-sim',
        ),
    ];
  }
}

/// Json decode that never throws.
Object? jsonDecodeSafe(String text) {
  try {
    return jsonDecode(text);
  } catch (_) {
    return null;
  }
}
