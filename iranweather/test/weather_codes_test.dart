import 'package:flutter_test/flutter_test.dart';

import 'package:iranweather/core/constants/weather_codes.dart';

void main() {
  test('کدِ WMO → وضعیت هوا', () {
    expect(fromWmoCode(0), WeatherCondition.clear);
    expect(fromWmoCode(2), WeatherCondition.partlyCloudy);
    expect(fromWmoCode(3), WeatherCondition.overcast);
    expect(fromWmoCode(61), WeatherCondition.rain);
    expect(fromWmoCode(71), WeatherCondition.snow);
    expect(fromWmoCode(95), WeatherCondition.thunderstorm);
    expect(fromWmoCode(96), WeatherCondition.thunderstormHail);
    expect(fromWmoCode(45), WeatherCondition.fog);
  });

  test('نام فارسی هر وضعیت غیر‌empty است', () {
    for (final c in WeatherCondition.values) {
      expect(conditionFa(c).isNotEmpty, isTrue);
      expect(conditionEn(c).isNotEmpty, isTrue);
    }
  });

  test('هر پالت رنگی روز و شب دارد', () {
    for (final c in WeatherCondition.values) {
      expect(SkyPalettes.day[c], isNotNull);
      expect(SkyPalettes.night[c], isNotNull);
    }
  });

  test('resolve با سالِ طلوع/غروب تغییر می‌کند', () {
    final noon = SkyPalettes.resolve(
        condition: WeatherCondition.clear, isDay: true, sunElevation: 60);
    final dawn = SkyPalettes.resolve(
        condition: WeatherCondition.clear, isDay: true, sunElevation: 3);
    expect(dawn.bottom, isNotEqualTo(noon.bottom));
  });

  test('palette شب تاریک‌تر از روز است', () {
    final day = SkyPalettes.resolve(
        condition: WeatherCondition.clear, isDay: true);
    final night = SkyPalettes.resolve(
        condition: WeatherCondition.clear, isDay: false);
    expect(night.top.value, lessThan(day.top.value));
  });
}
