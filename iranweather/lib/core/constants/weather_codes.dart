import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// وضعیت هوا در یک نگاه. هرکدام با یک پالت رنگی، یک انیمای پشت‌صحنه
/// و یک ایکان انیمیشنیک مخصص خودش دارد.
enum WeatherCondition {
  clear,
  mainlyClear,
  partlyCloudy,
  overcast,
  fog,
  drizzle,
  rain,
  freezingRain,
  snow,
  snowGrains,
  rainShowers,
  snowShowers,
  thunderstorm,
  thunderstormHail;

  bool get isStormy =>
      this == WeatherCondition.thunderstorm ||
      this == WeatherCondition.thunderstormHail;

  bool get isSnowy =>
      this == WeatherCondition.snow || this == WeatherCondition.snowGrains;

  bool get isRaining =>
      this == WeatherCondition.rain ||
      this == WeatherCondition.drizzle ||
      this == WeatherCondition.freezingRain ||
      this == WeatherCondition.rainShowers;

  bool get isCloudy =>
      this == WeatherCondition.partlyCloudy ||
      this == WeatherCondition.overcast ||
      this == WeatherCondition.fog;
}

/// کدهای WMO که Open-Meteo از آنها استفاده می‌کند به وضعیت هوا.
const Map<int, WeatherCondition> wmoTable = <int, WeatherCondition>{
  0: WeatherCondition.clear,
  1: WeatherCondition.mainlyClear,
  2: WeatherCondition.partlyCloudy,
  3: WeatherCondition.overcast,
  45: WeatherCondition.fog,
  48: WeatherCondition.fog,
  51: WeatherCondition.drizzle,
  53: WeatherCondition.drizzle,
  55: WeatherCondition.drizzle,
  56: WeatherCondition.freezingRain,
  57: WeatherCondition.freezingRain,
  61: WeatherCondition.rain,
  63: WeatherCondition.rain,
  65: WeatherCondition.rain,
  66: WeatherCondition.freezingRain,
  67: WeatherCondition.freezingRain,
  71: WeatherCondition.snow,
  73: WeatherCondition.snow,
  75: WeatherCondition.snow,
  77: WeatherCondition.snowGrains,
  80: WeatherCondition.rainShowers,
  81: WeatherCondition.rainShowers,
  82: WeatherCondition.rainShowers,
  85: WeatherCondition.snowShowers,
  86: WeatherCondition.snowShowers,
  95: WeatherCondition.thunderstorm,
  96: WeatherCondition.thunderstormHail,
  99: WeatherCondition.thunderstormHail,
};

WeatherCondition fromWmoCode(int code) =>
    wmoTable.putIfAbsent(code, () => WeatherCondition.clear);

/// نام فارسی هر وضعیت هوا.
String conditionFa(WeatherCondition c) {
  switch (c) {
    case WeatherCondition.clear:
      return 'آسمان صاف';
    case WeatherCondition.mainlyClear:
      return 'عموماً صاف';
    case WeatherCondition.partlyCloudy:
      return 'پاره‌ابری';
    case WeatherCondition.overcast:
      return 'ابری';
    case WeatherCondition.fog:
      return 'تنبله';
    case WeatherCondition.drizzle:
      return 'جوهره';
    case WeatherCondition.rain:
      return 'باران';
    case WeatherCondition.freezingRain:
      return 'باران یخی';
    case WeatherCondition.snow:
      return 'برف';
    case WeatherCondition.snowGrains:
      return 'برف‌دانه';
    case WeatherCondition.rainShowers:
      return 'باران‌سالی';
    case WeatherCondition.snowShowers:
      return 'برف‌سالی';
    case WeatherCondition.thunderstorm:
      return 'رعدوبرق';
    case WeatherCondition.thunderstormHail:
      return 'رعدوبرق و تگرگ';
  }
}

/// نام انگلیسی هر وضعیت هوا.
String conditionEn(WeatherCondition c) {
  switch (c) {
    case WeatherCondition.clear:
      return 'Clear sky';
    case WeatherCondition.mainlyClear:
      return 'Mainly clear';
    case WeatherCondition.partlyCloudy:
      return 'Partly cloudy';
    case WeatherCondition.overcast:
      return 'Overcast';
    case WeatherCondition.fog:
      return 'Fog';
    case WeatherCondition.drizzle:
      return 'Drizzle';
    case WeatherCondition.rain:
      return 'Rain';
    case WeatherCondition.freezingRain:
      return 'Freezing rain';
    case WeatherCondition.snow:
      return 'Snow';
    case WeatherCondition.snowGrains:
      return 'Snow grains';
    case WeatherCondition.rainShowers:
      return 'Rain showers';
    case WeatherCondition.snowShowers:
      return 'Snow showers';
    case WeatherCondition.thunderstorm:
      return 'Thunderstorm';
    case WeatherCondition.thunderstormHail:
      return 'Thunderstorm with hail';
  }
}

/// میزان خطر هر وضعیت برای رنگ‌بندی کارت‌های هشدار.
int dangerScore(WeatherCondition c) {
  switch (c) {
    case WeatherCondition.thunderstormHail:
      return 5;
    case WeatherCondition.thunderstorm:
      return 4;
    case WeatherCondition.rain:
    case WeatherCondition.rainShowers:
    case WeatherCondition.freezingRain:
    case WeatherCondition.snow:
    case WeatherCondition.snowGrains:
    case WeatherCondition.snowShowers:
      return 3;
    case WeatherCondition.drizzle:
    case WeatherCondition.fog:
      return 2;
    default:
      return 0;
  }
}

// --------------------------------------------------------------------------- //
// Palettes
// --------------------------------------------------------------------------- //

/// پالت یک آسمان: رنگ بالای صفحه، میانه، پایین، نور اصلی و رنگ تاکیدی.
@immutable
class SkyPalette {
  final Color top;
  final Color mid;
  final Color bottom;
  final Color glow;
  final Color accent;

  const SkyPalette({
    required this.top,
    required this.mid,
    required this.bottom,
    required this.glow,
    required this.accent,
  });

  List<Color> get stops => [top, mid, bottom];
}

/// تمام پالت‌های روزانه و شبانه.
abstract final class SkyPalettes {
  static const Map<WeatherCondition, SkyPalette> day = <WeatherCondition, SkyPalette>{
    WeatherCondition.clear: SkyPalette(
      top: Color(0xFF1A6BC0),
      mid: Color(0xFF5AA3E8),
      bottom: Color(0xFFBFDFFA),
      glow: Color(0xFFFFE1A1),
      accent: Color(0xFFFFD166),
    ),
    WeatherCondition.mainlyClear: SkyPalette(
      top: Color(0xFF2272C6),
      mid: Color(0xFF66A6E5),
      bottom: Color(0xFFC8E3FA),
      glow: Color(0xFFFFDFA8),
      accent: Color(0xFFFFCB7A),
    ),
    WeatherCondition.partlyCloudy: SkyPalette(
      top: Color(0xFF2C70BE),
      mid: Color(0xFF649CD3),
      bottom: Color(0xFFCBDFF4),
      glow: Color(0xFFFFD6AC),
      accent: Color(0xFFFFC485),
    ),
    WeatherCondition.overcast: SkyPalette(
      top: Color(0xFF404E67),
      mid: Color(0xFF66748F),
      bottom: Color(0xFFA6B1C5),
      glow: Color(0xFFD9DEE9),
      accent: Color(0xFFB9C3D4),
    ),
    WeatherCondition.fog: SkyPalette(
      top: Color(0xFF5C6672),
      mid: Color(0xFF8B949F),
      bottom: Color(0xFFC5CCD3),
      glow: Color(0xFFE9EBEF),
      accent: Color(0xFFC3C9D0),
    ),
    WeatherCondition.drizzle: SkyPalette(
      top: Color(0xFF335269),
      mid: Color(0xFF55708A),
      bottom: Color(0xFF9CB0C2),
      glow: Color(0xFFC4D5E2),
      accent: Color(0xFF8FA6BC),
    ),
    WeatherCondition.rain: SkyPalette(
      top: Color(0xFF24405A),
      mid: Color(0xFF446583),
      bottom: Color(0xFF86A2B9),
      glow: Color(0xFFB5CCE0),
      accent: Color(0xFF6E8CA8),
    ),
    WeatherCondition.freezingRain: SkyPalette(
      top: Color(0xFF274660),
      mid: Color(0xFF486F8B),
      bottom: Color(0xFF8FB0C3),
      glow: Color(0xFFCFE1EC),
      accent: Color(0xFF9CC0D8),
    ),
    WeatherCondition.snow: SkyPalette(
      top: Color(0xFF577090),
      mid: Color(0xFF8CA4C0),
      bottom: Color(0xFFDCE7F5),
      glow: Color(0xFFFFFFFF),
      accent: Color(0xFFE4EEF9),
    ),
    WeatherCondition.snowGrains: SkyPalette(
      top: Color(0xFF56708E),
      mid: Color(0xFF8BA5C1),
      bottom: Color(0xFFDBE6F4),
      glow: Color(0xFFFFFFFF),
      accent: Color(0xFFE2EDF8),
    ),
    WeatherCondition.rainShowers: SkyPalette(
      top: Color(0xFF2B5272),
      mid: Color(0xFF547C9C),
      bottom: Color(0xFF9CB6D1),
      glow: Color(0xFFC9DBEC),
      accent: Color(0xFF7F9DBA),
    ),
    WeatherCondition.snowShowers: SkyPalette(
      top: Color(0xFF536F8D),
      mid: Color(0xFF89A2BE),
      bottom: Color(0xFFD8E5F5),
      glow: Color(0xFFFFFFFF),
      accent: Color(0xFFCFE0F2),
    ),
    WeatherCondition.thunderstorm: SkyPalette(
      top: Color(0xFF131830),
      mid: Color(0xFF2C375C),
      bottom: Color(0xFF4A577E),
      glow: Color(0xFF8B7DFF),
      accent: Color(0xFFA99BFF),
    ),
    WeatherCondition.thunderstormHail: SkyPalette(
      top: Color(0xFF161A37),
      mid: Color(0xFF31375E),
      bottom: Color(0xFF545B85),
      glow: Color(0xFF9C8BFF),
      accent: Color(0xFFBEA8FF),
    ),
  };

  static const Map<WeatherCondition, SkyPalette> night = <WeatherCondition, SkyPalette>{
    WeatherCondition.clear: SkyPalette(
      top: Color(0xFF050A1C),
      mid: Color(0xFF0E1C42),
      bottom: Color(0xFF243C6C),
      glow: Color(0xFFFFFFFF),
      accent: Color(0xFF8FB0E8),
    ),
    WeatherCondition.mainlyClear: SkyPalette(
      top: Color(0xFF070C20),
      mid: Color(0xFF102249),
      bottom: Color(0xFF27406F),
      glow: Color(0xFFFFFFFF),
      accent: Color(0xFF8FB0E8),
    ),
    WeatherCondition.partlyCloudy: SkyPalette(
      top: Color(0xFF080C24),
      mid: Color(0xFF13244E),
      bottom: Color(0xFF2B4474),
      glow: Color(0xFFDDE7FF),
      accent: Color(0xFF7FA0DA),
    ),
    WeatherCondition.overcast: SkyPalette(
      top: Color(0xFF0D1020),
      mid: Color(0xFF1D2240),
      bottom: Color(0xFF333A5C),
      glow: Color(0xFFAEB8CE),
      accent: Color(0xFF808CA8),
    ),
    WeatherCondition.fog: SkyPalette(
      top: Color(0xFF12161E),
      mid: Color(0xFF262C38),
      bottom: Color(0xFF454D5A),
      glow: Color(0xFFBFC6CE),
      accent: Color(0xFF8E95A0),
    ),
    WeatherCondition.drizzle: SkyPalette(
      top: Color(0xFF0A0F1E),
      mid: Color(0xFF192338),
      bottom: Color(0xFF314257),
      glow: Color(0xFF8FA4BC),
      accent: Color(0xFF647893),
    ),
    WeatherCondition.rain: SkyPalette(
      top: Color(0xFF080C1A),
      mid: Color(0xFF162033),
      bottom: Color(0xFF2A3B52),
      glow: Color(0xFF7E95AE),
      accent: Color(0xFF5B7088),
    ),
    WeatherCondition.freezingRain: SkyPalette(
      top: Color(0xFF0A0F1D),
      mid: Color(0xFF1A2638),
      bottom: Color(0xFF2E4054),
      glow: Color(0xFF8FB0C6),
      accent: Color(0xFF6C849E),
    ),
    WeatherCondition.snow: SkyPalette(
      top: Color(0xFF0D1424),
      mid: Color(0xFF1E2C44),
      bottom: Color(0xFF3D5273),
      glow: Color(0xFFFFFFFF),
      accent: Color(0xFFAFC4DE),
    ),
    WeatherCondition.snowGrains: SkyPalette(
      top: Color(0xFF0C1322),
      mid: Color(0xFF1C2A42),
      bottom: Color(0xFF3A4F70),
      glow: Color(0xFFFFFFFF),
      accent: Color(0xFFA9BFDA),
    ),
    WeatherCondition.rainShowers: SkyPalette(
      top: Color(0xFF090D1C),
      mid: Color(0xFF182236),
      bottom: Color(0xFF2C3D53),
      glow: Color(0xFF8298B0),
      accent: Color(0xFF5E748E),
    ),
    WeatherCondition.snowShowers: SkyPalette(
      top: Color(0xFF0B1120),
      mid: Color(0xFF1B2840),
      bottom: Color(0xFF374B6C),
      glow: Color(0xFFFFFFFF),
      accent: Color(0xFFA6BBDA),
    ),
    WeatherCondition.thunderstorm: SkyPalette(
      top: Color(0xFF05060F),
      mid: Color(0xFF111630),
      bottom: Color(0xFF252C4E),
      glow: Color(0xFF7E70FF),
      accent: Color(0xFF9C8BFF),
    ),
    WeatherCondition.thunderstormHail: SkyPalette(
      top: Color(0xFF06070E),
      mid: Color(0xFF12162F),
      bottom: Color(0xFF262C4C),
      glow: Color(0xFF8E7DFF),
      accent: Color(0xFFBEA8FF),
    ),
  };

  /// پالت نهایی با در نظر گرفتن روز/شب و نزدیک بودن به طلوع یا غروب آفتاب.
  static SkyPalette resolve({
    required WeatherCondition condition,
    required bool isDay,
    double sunElevation = 0,
  }) {
    // در فاصلهٔ طلوع/غروب آسمان رنگ گرم و بنفش می‌گیرد.
    if (sunElevation > -8 && sunElevation < 14) {
      final t = (sunElevation + 8) / 22;
      final mix = (Color a, Color b) => Color.fromRGBO(
          lerpInt(a.red, b.red, t),
          lerpInt(a.green, b.green, t),
          lerpInt(a.blue, b.blue, t),
          1);
      return SkyPalette(
        top: mix(
            isDay ? const Color(0xFF1A4E9E) : const Color(0xFF0A1230),
            const Color(0xFF3B1E5C)),
        mid: mix(
            isDay ? const Color(0xFF4E9FE0) : const Color(0xFF1C2E5E),
            const Color(0xFF7A3A7A)),
        bottom: mix(
            isDay ? const Color(0xFFFFC987) : const Color(0xFF2A3A6B),
            const Color(0xFFD86A5A)),
        glow: mix(
            isDay ? const Color(0xFFFFE7C0) : const Color(0xFFB9C8EE),
            const Color(0xFFFFD9A0)),
        accent: mix(
            isDay ? const Color(0xFFFFB867) : const Color(0xFF7FA0DA),
            const Color(0xFFFF9E7A)),
      );
    }
    return (isDay ? day : night)[condition] ??
        (isDay ? day : night)[WeatherCondition.clear]!;
  }

  static int lerpInt(int a, int b, double t) =>
      (a + (b - a) * t).round().clamp(0, 0xFFFFFF);
}
