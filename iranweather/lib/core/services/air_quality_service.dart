import 'package:iranweather/core/network/api_client.dart';

/// کیفیت هوا و آلاینده‌ها از Open-Meteo Air Quality (آزاد، بدون key).
abstract final class AirQualityService {
  static Future<Map<String, double>> fetch({
    required double lat,
    required double lng,
  }) async {
    final body = await ApiClient.getJson(
      '$ApiClient.openMeteoAir/v1/air-quality',
      query: <String, String>{
        'latitude': lat.toStringAsFixed(4),
        'longitude': lng.toStringAsFixed(4),
        'timezone': ApiClient.timezone,
        'current':
            'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi',
        'past_days': '1',
      },
    );

    final cur = Map<String, dynamic>.from(body['current'] ?? {});
    return <String, double>{
      'pm10': _d(cur, 'pm10'),
      'pm25': _d(cur, 'pm2_5'),
      'co': _d(cur, 'carbon_monoxide'),
      'no2': _d(cur, 'nitrogen_dioxide'),
      'so2': _d(cur, 'sulphur_dioxide'),
      'o3': _d(cur, 'ozone'),
      'europeanAqi': _d(cur, 'european_aqi'),
      'usAqi': _d(cur, 'us_aqi'),
    };
  }

  /// Diagramِ آلاینده‌ها برای 24 ساعتِ گذشته.
  static Future<List<({DateTime time, double aqi})>> history(
      {required double lat, required double lng}) async {
    final body = await ApiClient.getJson(
      '$ApiClient.openMeteoAir/v1/air-quality',
      query: <String, String>{
        'latitude': lat.toStringAsFixed(4),
        'longitude': lng.toStringAsFixed(4),
        'timezone': ApiClient.timezone,
        'hourly': 'european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide',
        'past_days': '2',
        'forecast_days': '1',
      },
    );
    final hourly = Map<String, dynamic>.from(body['hourly'] ?? {});
    final times = (hourly['time'] as List?)?.cast<String>() ?? const [];
    final aqis = (hourly['european_aqi'] as List?)?.cast<num>() ?? const [];
    return times
        .asMap()
        .entries
        .map((e) => (
              time: DateTime.parse(e.key as String),
              aqi: aqis.elementAtOrNull(e.key)?.toDouble() ?? 0,
            ))
        .take(48)
        .toList(growable: false);
  }

  static double _d(Map<String, dynamic> m, String key) =>
      (m[key] as num?)?.toDouble() ?? 0;
}
