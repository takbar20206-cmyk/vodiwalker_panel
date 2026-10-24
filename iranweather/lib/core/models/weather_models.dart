import 'package:flutter/foundation.dart';

import 'package:iranweather/core/constants/weather_codes.dart';

/// دات‌کلاس‌های اصلی پاسخ Open-Meteo.
@immutable
class CurrentWeather {
  final double temperature;
  final double apparentTemperature;
  final double humidity;
  final double dewPoint;
  final double pressure;
  final double windSpeed;
  final double windGust;
  final double windDirection;
  final double cloudCover;
  final double precipitation;
  final double uvIndex;
  final double visibility;
  final int weatherCode;
  final bool isDay;
  final DateTime time;

  const CurrentWeather({
    required this.temperature,
    required this.apparentTemperature,
    required this.humidity,
    required this.dewPoint,
    required this.pressure,
    required this.windSpeed,
    required this.windGust,
    required this.windDirection,
    required this.cloudCover,
    required this.precipitation,
    required this.uvIndex,
    required this.visibility,
    required this.weatherCode,
    required this.isDay,
    required this.time,
  });

  WeatherCondition get condition => fromWmoCode(weatherCode);

  /// جهت باد در میله‌ی ۳۶۰‌درجه، به نام فارسی.
  String get windDirectionFa {
    const names = [
      ' شمال',
      ' شمال‌شرقی',
      ' شرق',
      ' جنوب‌شرقی',
      ' جنوب',
      ' جنوب‌غربی',
      ' غرب',
      ' شمال‌غربی',
    ];
    return names[(((windDirection / 45) as int) % 8 + 8) % 8].trim();
  }

  /// احساس واقعیِ هوا با توجه به رطوبت و باد.
  String get feelsLikeLabel => 'حس واقعی';
}

@immutable
class HourlyPoint {
  final DateTime time;
  final double temperature;
  final double humidity;
  final double precipitationProbability;
  final double precipitation;
  final double windSpeed;
  final double uvIndex;
  final double visibility;
  final int weatherCode;
  final bool isDay;

  const HourlyPoint({
    required this.time,
    required this.temperature,
    required this.humidity,
    required this.precipitationProbability,
    required this.precipitation,
    required this.windSpeed,
    required this.uvIndex,
    required this.visibility,
    required this.weatherCode,
    required this.isDay,
  });

  WeatherCondition get condition => fromWmoCode(weatherCode);
}

@immutable
class DailyForecast {
  final DateTime date;
  final double tempMax;
  final double tempMin;
  final int weatherCode;
  final double precipitationSum;
  final double precipitationProbability;
  final double windSpeedMax;
  final double uvIndexMax;
  final double sunshineDuration;
  final DateTime sunrise;
  final DateTime sunset;

  const DailyForecast({
    required this.date,
    required this.tempMax,
    required this.tempMin,
    required this.weatherCode,
    required this.precipitationSum,
    required this.precipitationProbability,
    required this.windSpeedMax,
    required this.uvIndexMax,
    required this.sunshineDuration,
    required this.sunrise,
    required this.sunset,
  });

  WeatherCondition get condition => fromWmoCode(weatherCode);


  /// وسعتِ دما در روز (حداکثر − حداقل).
  double get span => tempMax - tempMin;
}

@immutable
class WeatherReport {
  final CurrentWeather current;
  final List<HourlyPoint> hourly;
  final List<DailyForecast> daily;
  final DateTime fetchedAt;

  const WeatherReport({
    required this.current,
    required this.hourly,
    required this.daily,
    required this.fetchedAt,
  });

  /// متوسط دمای ۲۴ ساعتهٔ آینده.
  double get avgTemp24h {
    if (hourly.isEmpty) return current.temperature;
    return hourly.fold<double>(0, (s, h) => s + h.temperature) / hourly.length;
  }

  /// مجموع بارش در ۲۴ ساعتٔ آینده (میلی‌متر).
  double get precipitation24h =>
      hourly.fold<double>(0, (s, h) => s + h.precipitation);
}
