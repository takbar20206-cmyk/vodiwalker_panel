import 'dart:async';

import 'package:iranweather/core/network/api_client.dart';
import 'package:iranweather/core/models/weather_models.dart';

/// سرویس هواشناسی مبتنی‌بر Open-Meteo (آزاد، بدون key).
///
///  * `forecast`   — current + hourly(48h) + daily(7d)
///  * `airQuality` — pm2.5, pm10, no2, o3, so2, co, european_aqi
class WeatherService {
  WeatherService._();

  static const String forecastUrl = '$ApiClient.openMeteo/v1/forecast';

  static Future<WeatherReport> forecast({
    required double lat,
    required double lng,
    bool airQuality = true,
  }) async {
    final Map<String, String> q = <String, String>{
      'latitude': lat.toStringAsFixed(4),
      'longitude': lng.toStringAsFixed(4),
      'timezone': ApiClient.timezone,
      'forecast_days': '7',
      'current': _currentParams,
      'hourly': _hourlyParams,
      'daily': _dailyParams,
    };

    final Map<String, dynamic> body = await ApiClient.getJson(
      forecastUrl,
      query: q,
      retries: 3,
    );

    final Map<String, dynamic> cur = Map<String, dynamic>.from(body['current'] ?? {});
    final Map<String, dynamic> hourlyRaw =
        Map<String, dynamic>.from(body['hourly'] ?? {});
    final Map<String, dynamic> dailyRaw =
        Map<String, dynamic>.from(body['daily'] ?? {});

    final hourly = _parseHourly(hourlyRaw);
    final daily = _parseDaily(dailyRaw);

    final current = CurrentWeather(
      temperature: _d(cur, 'temperature_2m'),
      apparentTemperature: _d(cur, 'apparent_temperature'),
      humidity: _d(cur, 'relative_humidity_2m'),
      dewPoint: _d(cur, 'dew_point_2m'),
      pressure: _d(cur, 'pressure_msl'),
      windSpeed: _d(cur, 'wind_speed_10m'),
      windGust: _d(cur, 'wind_gusts_10m'),
      windDirection: _d(cur, 'wind_direction_10m'),
      cloudCover: _d(cur, 'cloud_cover'),
      precipitation: _d(cur, 'precipitation'),
      uvIndex: _d(cur, 'uv_index'),
      visibility: _d(cur, 'visibility'),
      weatherCode: (cur['weather_code'] as num?)?.toInt() ?? 0,
      isDay: (cur['is_day'] as num?)?.toInt() == 1,
      time: (cur['time'] as String?) != null
          ? DateTime.parse(cur['time'] as String)
          : DateTime.now(),
    );

    return WeatherReport(
      current: current,
      hourly: hourly,
      daily: daily,
      fetchedAt: DateTime.now(),
    );
  }

  static const String _currentParams =
      'temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,pressure_msl,surface_pressure,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,visibility';

  static const String _hourlyParams =
      'temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,visibility,uv_index,is_day';

  static const String _dailyParams =
      'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunshine_duration';

  static List<HourlyPoint> _parseHourly(Map<String, dynamic> raw) {
    final times = (raw['time'] as List?)?.cast<String>() ?? const [];
    final temps = (raw['temperature_2m'] as List?)?.cast<num>() ?? const [];
    final hums = (raw['relative_humidity_2m'] as List?)?.cast<num>() ?? const [];
    final pops = (raw['precipitation_probability'] as List?)?.cast<num>() ?? const [];
    final prs = (raw['precipitation'] as List?)?.cast<num>() ?? const [];
    final ws = (raw['wind_speed_10m'] as List?)?.cast<num>() ?? const [];
    final vis = (raw['visibility'] as List?)?.cast<num>() ?? const [];
    final uvs = (raw['uv_index'] as List?)?.cast<num>() ?? const [];
    final codes = (raw['weather_code'] as List?)?.cast<num>() ?? const [];
    final days = (raw['is_day'] as List?)?.cast<num>() ?? const [];

    final out = <HourlyPoint>[];
    for (var i = 0; i < times.length && i < 48; i++) {
      out.add(
        HourlyPoint(
          time: DateTime.parse(times[i]),
          temperature: temps.elementAtOrNull(i)?.toDouble() ?? 0,
          humidity: hums.elementAtOrNull(i)?.toDouble() ?? 0,
          precipitationProbability: pops.elementAtOrNull(i)?.toDouble() ?? 0,
          precipitation: prs.elementAtOrNull(i)?.toDouble() ?? 0,
          windSpeed: ws.elementAtOrNull(i)?.toDouble() ?? 0,
          uvIndex: uvs.elementAtOrNull(i)?.toDouble() ?? 0,
          visibility: vis.elementAtOrNull(i)?.toDouble() ?? 0,
          weatherCode: codes.elementAtOrNull(i)?.toInt() ?? 0,
          isDay: days.elementAtOrNull(i)?.toInt() == 1,
        ),
      );
    }
    return out;
  }

  static List<DailyForecast> _parseDaily(Map<String, dynamic> raw) {
    final times = (raw['time'] as List?)?.cast<String>() ?? const [];
    final max = (raw['temperature_2m_max'] as List?)?.cast<num>() ?? const [];
    final min = (raw['temperature_2m_min'] as List?)?.cast<num>() ?? const [];
    final codes = (raw['weather_code'] as List?)?.cast<num>() ?? const [];
    final psum = (raw['precipitation_sum'] as List?)?.cast<num>() ?? const [];
    final ppop =
        (raw['precipitation_probability_max'] as List?)?.cast<num>() ?? const [];
    final wmax = (raw['wind_speed_10m_max'] as List?)?.cast<num>() ?? const [];
    final uvmax = (raw['uv_index_max'] as List?)?.cast<num>() ?? const [];
    final sun = (raw['sunshine_duration'] as List?)?.cast<num>() ?? const [];
    final sr = (raw['sunrise'] as List?)?.cast<String>() ?? const [];
    final ss = (raw['sunset'] as List?)?.cast<String>() ?? const [];

    final out = <DailyForecast>[];
    for (var i = 0; i < times.length; i++) {
      out.add(
        DailyForecast(
          date: DateTime.parse(times[i]),
          tempMax: max.elementAtOrNull(i)?.toDouble() ?? 0,
          tempMin: min.elementAtOrNull(i)?.toDouble() ?? 0,
          weatherCode: codes.elementAtOrNull(i)?.toInt() ?? 0,
          precipitationSum: psum.elementAtOrNull(i)?.toDouble() ?? 0,
          precipitationProbability: ppop.elementAtOrNull(i)?.toDouble() ?? 0,
          windSpeedMax: wmax.elementAtOrNull(i)?.toDouble() ?? 0,
          uvIndexMax: uvmax.elementAtOrNull(i)?.toDouble() ?? 0,
          sunshineDuration: sun.elementAtOrNull(i)?.toDouble() ?? 0,
          sunrise: sr.elementAtOrNull(i) != null
              ? DateTime.parse(sr.elementAtOrNull(i) as String)
              : DateTime(2000, 1, 1),
          sunset: ss.elementAtOrNull(i) != null
              ? DateTime.parse(ss.elementAtOrNull(i) as String)
              : DateTime(2000, 1, 1),
        ),
      );
    }
    return out;
  }

  ///คะ qualities هوا — also from Open-Meteo (آزاد).
  static Future<Map<String, double>> airQuality(
      {required double lat, required double lng}) async {
    final body = await ApiClient.getJson(
      '$ApiClient.openMeteoAir/v1/air-quality',
      query: <String, String>{
        'latitude': lat.toStringAsFixed(4),
        'longitude': lng.toStringAsFixed(4),
        'timezone': ApiClient.timezone,
        'current':
            'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi',
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

  /// جست‌وجو شەھەر‌های ایران از Open-Meteo geocoding (finds any city, not only the bundled list).
  static Future<List<Map<String, dynamic>>> searchCity(String name) async {
    final body = await ApiClient.getJson(
      '$ApiClient.geocoding/v1/search',
      query: <String, String>{
        'name': name,
        'count': '10',
        'language': 'fa',
        'format': 'json',
      },
    );
    final features = (body['results'] as List?)?.cast<Map<String, dynamic>>() ??
        const [];
    return features.where((f) => ((f['country'] as String?) ?? '') == 'Iran')
        .map((f) => Map<String, dynamic>.from(f))
        .toList();
  }

  static double _d(Map<String, dynamic> m, String key) =>
      (m[key] as num?)?.toDouble() ?? 0;
}
