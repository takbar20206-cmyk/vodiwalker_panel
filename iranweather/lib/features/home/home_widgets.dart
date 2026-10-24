import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import 'package:iranweather/core/constants/weather_codes.dart';
import 'package:iranweather/core/models/weather_models.dart';
import 'package:iranweather/core/utils/jalaali.dart';
import 'package:iranweather/core/utils/persian_number.dart';
import 'package:iranweather/core/utils/units.dart';
import 'package:iranweather/shared/widgets/glass_card.dart';

/// کارت دمای اصلی با ikon انیمیشنیک و انیمایِ تغییرِ دما.
class CurrentHero extends StatelessWidget {
  final CurrentWeather current;
  final String cityName;
  final String cityProvince;
  final DateTime sunrise;
  final DateTime sunset;

  const CurrentHero({
    super.key,
    required this.current,
    required this.cityName,
    required this.cityProvince,
    required this.sunrise,
    required this.sunset,
  });

  @override
  Widget build(BuildContext context) {
    final cond = current.condition;
    final pal = SkyPalettes.resolve(
      condition: cond,
      isDay: current.isDay,
      sunElevation: _sunElevation(sunrise, sunset, current.time),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  cityName,
                  style: const TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.w300,
                      letterSpacing: -0.6),
                ),
                const SizedBox(height: 4),
                Text(
                  cityProvince,
                  style: const TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w400),
                ),
                const SizedBox(height: 6),
                Text(
                  '${Jalaali.format(current.time)} · '
                  '${Jalaali.weekdayName(current.time)}',
                  style: const TextStyle(fontSize: 13),
                ),
              ],
            ),
            IconButton(
              icon: const Icon(Icons.refresh_rounded),
              onPressed: () =>
                  FocusScope.of(context).requestKeyboardFocus(),
              visualDensity: VisualDensity.compact,
            ),
          ],
        ),
        const SizedBox(height: 14),
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              toPersianDigits(current.temperature.toStringAsFixed(0)),
              style: const TextStyle(
                  fontSize: 96,
                  fontWeight: FontWeight.w200,
                  height: 0.95,
                  letterSpacing: -3),
            ),
            const Padding(
              padding: EdgeInsets.only(bottom: 20),
              child: Text('c', style: TextStyle(fontSize: 30)),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Row(
          children: [
            SizedBox(
              width: 120,
              height: 120,
              child: CustomPaint(
                painter: _BigIconPainter(
                    condition: cond,
                    isDay: current.isDay,
                    phase: (DateTime.now().millisecondsSinceEpoch / 1000) % 1.0),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    conditionFa(cond),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${toPersianDigits(current.temperature.toStringAsFixed(0))}° احساس واقعی',
                    style: const TextStyle(fontSize: 14),
                  ),
                  const SizedBox(height: 10),
                  _hiLoRow(current, pal),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _hiLoRow(CurrentWeather current, SkyPalette pal) {
    return Row(
      children: [
        _pill(context, '${toPersianDigits(_hi(current).toStringAsFixed(0))}°',
            icon: Icons.thermostat, color: const Color(0xFFFF9E6B)),
        const SizedBox(width: 6),
        _pill(context, '${toPersianDigits(_lo(current).toStringAsFixed(0))}°',
            icon: Icons.ac_unit_rounded, color: const Color(0xFF7FC8FF)),
      ],
    );
  }

  Widget _pill(BuildContext context, String label,
      {required IconData icon, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }

  double _hi(CurrentWeather c) => c.temperature;
  double _lo(CurrentWeather c) => c.apparentTemperature;

  /// ارتفاع خورشید (درجه) با missِ ساده.
  double _sunElevation(DateTime sr, DateTime ss, DateTime now) {
    final t = now.millisecondsSinceEpoch;
    final t0 = sr.millisecondsSinceEpoch;
    final t1 = ss.millisecondsSinceEpoch;
    final k = ((t - t0) / (t1 - t0)).clamp(0.0, 1.0);
    return math.sin(k * math.pi) * 80 - 6;
  }
}

class _BigIconPainter extends CustomPainter {
  final WeatherCondition condition;
  final bool isDay;
  final double phase;

  _BigIconPainter({
    required this.condition,
    required this.isDay,
    required this.phase,
  });

  @override
  void paint(Canvas canvas, Rect rect) {
    final cx = rect.center.dx;
    final cy = rect.center.dy;
    final s = rect.width / 100;

    // halo
    canvas.drawCircle(uiOffset(cx, cy), 34 * s,
        Paint()..color = const Color(0x26FFFFFF));

    final Paint cloudPaint = Paint()..color = Colors.white.withValues(alpha: 0.95);
    final double cloudScale = s * 1.15;
    double bob = math.sin(phase * math.pi * 2) * s * 2.5;

    final puffs = <(double x, double y, double r)>[
      (-0.42, bob, 0.30),
      (-0.10, bob - 0.20, 0.34),
      (0.14, bob - 0.30, 0.36),
      (0.40, bob - 0.06, 0.27),
      (0.02, bob + 0.16, 0.33),
    ];
    for (final (x, y, r) in puffs) {
      canvas.drawCircle(uiOffset(cx + x * cloudScale * 1.0, cy + y * cloudScale),
          r * cloudScale, cloudPaint);
    }

    switch (condition) {
      case WeatherCondition.clear:
        if (isDay) {
          _drawSun(canvas, cx, cy, 26 * s, phase);
        } else {
          _drawMoon(canvas, cx, cy, 26 * s, phase);
        }
      case WeatherCondition.mainlyClear:
        if (isDay) _drawSun(canvas, cx - 26 * s, cy - 20 * s, 18 * s, phase);
        _cloudSmall(canvas, cx + 24 * s, cy + 18 * s, 0.7 * s, bob);
      case WeatherCondition.partlyCloudy:
        if (isDay) _drawSun(canvas, cx - 30 * s, cy - 26 * s, 20 * s, phase);
        else _drawMoon(canvas, cx - 30 * s, cy - 26 * s, 20 * s, phase);
        _cloudSmall(canvas, cx + 26 * s, cy + 24 * s, 0.85 * s, bob);
      case WeatherCondition.overcast:
        _cloudSmall(canvas, cx, cy, 1.3 * s, bob,
            color: const Color(0xFF8895AA));
      case WeatherCondition.fog:
        _cloudSmall(canvas, cx, cy - 16 * s, 1.0 * s, bob,
            color: const Color(0xFF9AA5B4));
        _fog(canvas, cx, cy + 20 * s, 30 * s, phase);
      case WeatherCondition.drizzle:
        _cloudSmall(canvas, cx, cy - 14 * s, 1.0 * s, bob);
        _rain(canvas, cx, cy + 20 * s, 26 * s, phase, 3, light: true);
      case WeatherCondition.rain:
        _cloudSmall(canvas, cx, cy - 12 * s, 1.1 * s, bob,
            color: const Color(0xFF6B7C93));
        _rain(canvas, cx, cy + 22 * s, 30 * s, phase, 4);
      case WeatherCondition.rainShowers:
        _cloudSmall(canvas, cx - 10 * s, cy - 16 * s, 0.8 * s, bob);
        _drawSun(canvas, cx + 30 * s, cy - 30 * s, 13 * s, phase);
        _rain(canvas, cx - 12 * s, cy + 22 * s, 26 * s, phase, 3);
      case WeatherCondition.freezingRain:
        _cloudSmall(canvas, cx, cy - 12 * s, 1.1 * s, bob,
            color: const Color(0xFF8FA6BC));
        _rain(canvas, cx, cy + 22 * s, 30 * s, phase, 3, light: true);
      case WeatherCondition.snow:
        _cloudSmall(canvas, cx, cy - 12 * s, 1.0 * s, bob,
            color: const Color(0xFF9FB2C8));
        _snow(canvas, cx, cy + 22 * s, 30 * s, phase, 4);
      case WeatherCondition.snowGrains:
        _cloudSmall(canvas, cx, cy - 12 * s, 0.95 * s, bob,
            color: const Color(0xFF9FB2C8));
        _snow(canvas, cx, cy + 22 * s, 26 * s, phase, 3);
      case WeatherCondition.snowShowers:
        _cloudSmall(canvas, cx - 8 * s, cy - 16 * s, 0.75 * s, bob);
        _snow(canvas, cx - 10 * s, cy + 22 * s, 26 * s, phase, 3);
      case WeatherCondition.thunderstorm:
        _cloudSmall(canvas, cx, cy - 10 * s, 1.2 * s, bob,
            color: const Color(0xFF3B4358));
        _bolt(canvas, cx, cy + 20 * s, phase);
      case WeatherCondition.thunderstormHail:
        _cloudSmall(canvas, cx, cy - 10 * s, 1.2 * s, bob,
            color: const Color(0xFF2F3548));
        _bolt(canvas, cx, cy + 20 * s, phase);
        _snowDot(canvas, cx - 20 * s, cy + 46 * s, 5 * s);
    }
  }

  void _cloudSmall(Canvas canvas, double cx, double cy, double scale, double bob,
      {Color color = Colors.white}) {
    final paint = Paint()..color = color.withValues(alpha: 0.96);
    final w = 58 * scale;
    for (final (ox, oy, r) in const [
      (-0.42, 0.0, 0.30),
      (-0.10, -0.20, 0.34),
      (0.14, -0.30, 0.36),
      (0.40, -0.06, 0.27),
      (0.02, 0.16, 0.33),
    ]) {
      canvas.drawCircle(uiOffset(cx + ox * w, cy + oy * w + bob), r * w, paint);
    }
    canvas.drawRRect(
        RRect.fromRectAndRadius(
            Rect.fromCenter(cx, cy + bob + w * 0.14, w * 0.98, w * 0.26),
            w * 0.13),
        Paint()..color = color.withValues(alpha: 0.9));
  }

  void _drawSun(Canvas canvas, double cx, double cy, double r, double phase) {
    final rot = phase * math.pi * 2;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = r * 0.13
      ..strokeCap = StrokeCap.round
      ..color = const Color(0xFFFFD166);
    for (var i = 0; i < 8; i++) {
      final a = rot + i * (math.pi / 4);
      canvas.drawLine(
          uiOffset(cx + math.cos(a) * r * 0.95, cy + math.sin(a) * r * 0.95),
          uiOffset(cx + math.cos(a) * r * 1.42, cy + math.sin(a) * r * 1.42),
          paint);
    }
    canvas.drawCircle(uiOffset(cx, cy), r * 0.68,
        Paint()..color = const Color(0xFFFFD166).withValues(alpha: 0.3));
    canvas.drawCircle(uiOffset(cx, cy), r * 0.5,
        Paint()..color = const Color(0xFFFFD166));
  }

  void _drawMoon(Canvas canvas, double cx, double cy, double r, double phase) {
    canvas.drawCircle(uiOffset(cx, cy), r * 0.72,
        Paint()..color = const Color(0xFFF2F5FB));
    canvas.drawCircle(uiOffset(cx + r * 0.34, cy - r * 0.12), r * 0.6,
        Paint()..color = const Color(0xFF0B1836));
  }

  void _rain(Canvas canvas, double cx, double cy, double w, double phase,
      int drops, {bool light = false}) {
    final span = w * 0.9;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = light ? 2 : 2.6
      ..strokeCap = StrokeCap.round
      ..color = const Color(0xFFA8D4FF);
    for (var i = 0; i < drops; i++) {
      final t = (phase + i / drops) % 1.0;
      final x = cx - span / 2 + (i + 0.5) * (span / drops);
      final y = cy + t * 26;
      canvas.drawLine(uiOffset(x, y), uiOffset(x - 3, y + 12), paint);
    }
  }

  void _snow(Canvas canvas, double cx, double cy, double w, double phase, int n) {
    final span = w * 0.95;
    for (var i = 0; i < n; i++) {
      final t = (phase + i / n) % 1.0;
      final x = cx - span / 2 + (i + 0.5) * (span / n) +
          math.sin(t * math.pi * 4 + i) * 3;
      _snowDot(canvas, x, cy + t * 26, 5);
    }
  }

  void _snowDot(Canvas canvas, double x, double y, double r) {
    final paint = Paint()..color = const Color(0xFFFFFFFF);
    canvas.drawCircle(uiOffset(x, y), r, paint);
    for (var i = 0; i < 6; i++) {
      final a = i * (math.pi / 3);
      canvas.drawLine(uiOffset(x + math.cos(a) * r, y + math.sin(a) * r),
          uiOffset(x + math.cos(a) * r * 1.7, y + math.sin(a) * r * 1.7),
          paint
            ..strokeWidth = 1.2
            ..style = PaintingStyle.stroke);
    }
  }

  void _bolt(Canvas canvas, double cx, double cy, double phase) {
    final flash = math.sin(phase * math.pi * 4) * 0.5 + 0.5;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.4
      ..strokeCap = StrokeCap.round
      ..color = const Color(0xFFFFE066);
    final path = Path()
      ..moveTo(cx + 5, cy)
      ..lineTo(cx - 7, cy + 14)
      ..lineTo(cx + 1, cy + 14)
      ..lineTo(cx - 4, cy + 28)
      ..lineTo(cx + 13, cy + 8)
      ..lineTo(cx + 4, cy + 8)
      ..lineTo(cx + 10, cy)
      ..close();
    canvas.drawPath(path, paint);
    if (flash > 0.85) {
      canvas.drawPath(path, Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 10
        ..color = const Color(0xFFFFFFFF).withValues(alpha: 0.5));
    }
  }

  void _fog(Canvas canvas, double cx, double cy, double w, double phase) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.4
      ..strokeCap = StrokeCap.round
      ..color = const Color(0xFFC6D0DC).withValues(alpha: 0.8);
    for (var i = 0; i < 3; i++) {
      final t = (phase + i / 3) % 1.0;
      final shift = (t - 0.5) * w * 0.5;
      final s = i == 0 ? w * 0.62 : i == 1 ? w * 0.78 : w * 0.5;
      canvas.drawLine(uiOffset(cx - s / 2 + shift, cy + i * 8),
          uiOffset(cx + s / 2 + shift, cy + i * 8), paint);
    }
  }

  @override
  bool shouldRepaint(covariant _BigIconPainter old) =>
      old.condition != condition || old.isDay != isDay;
}

ui.Offset uiOffset(double x, double y) => ui.Offset(x, y);

/// شبکه‌یِ indicatorهای هوا: رطوبت، باد، فشار، تابش خورشید، دید،
/// نقطه‌ی شبنم، بارش، پوشش ابر.
class MetricGrid extends StatelessWidget {
  final CurrentWeather current;

  const MetricGrid({super.key, required this.current});

  @override
  Widget build(BuildContext context) {
    final c = current;
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        mainAxisSpacing: 12,
        crossAxisSpacing: 8,
        childAspectRatio: 0.62,
      ),
      itemCount: 8,
      itemBuilder: (context, i) => _metric(context, i, c),
    );
  }

  Widget _metric(BuildContext context, int i, CurrentWeather c) {
    final (icon, label, value) = switch (i) {
      0 => (Icons.water_drop_outlined, 'رطوبت',
          toPersianDigits(c.humidity.toStringAsFixed(0)) + '٪'),
      1 => (Icons.air, 'باد', UnitLabels.wind(c.windSpeed)),
      2 => (Icons.compress, 'فشار', UnitLabels.pressure(c.pressure)),
      3 => (Icons.wb_sunny_rounded, 'تابش',
          '${toPersianDigits(c.uvIndex.toStringAsFixed(1))}'),
      4 => (Icons.visibility_outlined, 'دید',
          UnitLabels.visibility(c.visibility)),
      5 => (Icons.water_drop, 'شبنم',
          '${toPersianDigits(c.dewPoint.toStringAsFixed(0))}°'),
      6 => (Icons.grain, 'بارش',
          UnitLabels.precipitation(c.precipitation)),
      7 => (Icons.cloud_queue_rounded, 'ابری',
          '${toPersianDigits(c.cloudCover.toStringAsFixed(0))}٪'),
      _ => (Icons.help, '', ''),
    };

    final frac = switch (i) {
      0 => c.humidity / 100,
      1 => (c.windSpeed / 60).clamp(0.0, 1.0),
      2 => ((c.pressure - 980) / 80).clamp(0.0, 1.0),
      3 => (c.uvIndex / 12).clamp(0.0, 1.0),
      4 => (c.visibility / 20).clamp(0.0, 1.0),
      5 => (c.dewPoint / 35).clamp(-0.2, 1.0),
      6 => (c.precipitation / 8).clamp(0.0, 1.0),
      7 => (c.cloudCover / 100).clamp(0.0, 1.0),
      _ => 0,
    };

    return Column(
      children: [
        Icon(icon, size: 17,
            color: const Color(0xFF9FC4FF).withValues(alpha: 0.9)),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(3),
          child: LinearProgressIndicator(
            value: frac.clamp(0.0, 1.0),
            minHeight: 3,
            backgroundColor: Colors.white.withValues(alpha: 0.1),
            color: const Color(0xFF7FC8FF),
          ),
        ),
        const SizedBox(height: 5),
        Text(value, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
        const SizedBox(height: 1),
        Text(label, style: const TextStyle(fontSize: 9)),
      ],
    );
  }
}

/// نوار ابری ساعت‌های آینده.
class HourlyStrip extends StatelessWidget {
  final List<HourlyPoint> hourly;
  final DateTime now;

  const HourlyStrip({super.key, required this.hourly, required this.now});

  @override
  Widget build(BuildContext context) {
    final upcoming = hourly.take(24).toList();
    return SizedBox(
      height: 116,
      child: ListView.separated(
        shrinkWrap: true,
        physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
        scrollDirection: Axis.horizontal,
        itemCount: upcoming.length,
        separatorBuilder: (context, _) => const SizedBox(width: 12),
        itemBuilder: (context, i) => _hourTile(context, upcoming[i], now),
      ),
    );
  }

  Widget _hourTile(BuildContext context, HourlyPoint h, DateTime now) {
    final isNow =
        h.time.difference(now).inMinutes.abs() < 60;
    return SizedBox(
      width: 66,
      child: Column(
        children: [
          Text(
            isNow ? 'اکنون' : Jalaali.weekdayName(h.time),
            style: const TextStyle(fontSize: 11),
          ),
          const SizedBox(height: 8),
          CustomPaint(
            size: const Size(40, 40),
            painter: _HourIconPainter(condition: h.condition, isDay: h.isDay),
          ),
          const SizedBox(height: 8),
          Text(
            toPersianDigits(h.temperature.toStringAsFixed(0)) + '°',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 2),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.grain, size: 9,
                  color: h.precipitationProbability > 0
                      ? const Color(0xFF7FC8FF)
                      : Colors.white.withValues(alpha: 0.3)),
              const SizedBox(width: 2),
              Text(
                h.precipitationProbability > 0
                    ? toPersianDigits(h.precipitationProbability.round().toString())
                    : '۰',
                style: const TextStyle(fontSize: 9),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HourIconPainter extends CustomPainter {
  final WeatherCondition condition;
  final bool isDay;
  _HourIconPainter({required this.condition, required this.isDay});

  @override
  void paint(Canvas canvas, Rect rect) {
    const cx = 20.0;
    const cy = 20.0;
    final s = 1.0;
    final paint = Paint()..color = Colors.white.withValues(alpha: 0.95);

    void cloud() {
      final w = 58 * s * 0.62;
      for (final (ox, oy, r) in const [
        (-0.42, 0.0, 0.30),
        (-0.10, -0.20, 0.34),
        (0.14, -0.30, 0.36),
        (0.40, -0.06, 0.27),
        (0.02, 0.16, 0.33),
      ]) {
        canvas.drawCircle(uiOffset(cx + ox * w, cy + oy * w), r * w, paint);
      }
    }

    if (isDay) {
      canvas.drawCircle(uiOffset(cx, cy), 6.2,
          Paint()..color = const Color(0xFFFFD166));
    } else {
      canvas.drawCircle(uiOffset(cx, cy), 6.2,
          Paint()..color = const Color(0xFFF2F5FB));
    }

    switch (condition) {
      case WeatherCondition.clear:
      case WeatherCondition.mainlyClear:
      case WeatherCondition.partlyCloudy:
      case WeatherCondition.overcast:
      case WeatherCondition.fog:
      case WeatherCondition.drizzle:
      case WeatherCondition.rain:
      case WeatherCondition.rainShowers:
      case WeatherCondition.freezingRain:
      case WeatherCondition.snow:
      case WeatherCondition.snowGrains:
      case WeatherCondition.snowShowers:
      case WeatherCondition.thunderstorm:
      case WeatherCondition.thunderstormHail:
        cloud();
    }
  }

  @override
  bool shouldRepaint(covariant _HourIconPainter old) =>
      old.condition != condition || old.isDay != isDay;
}

/// لیست ۷ روزهٔ پیش‌بینی.
class DailyStrip extends StatelessWidget {
  final List<DailyForecast> daily;

  const DailyStrip({super.key, required this.daily});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: daily.length,
      separatorBuilder: (context, _) =>
          const SizedBox(height: 10, width: 16),
      itemBuilder: (context, i) => _dayTile(daily[i], i),
    );
  }

  Widget _dayTile(DailyForecast d, int i) {
    final all = daily;
    final min = all.fold<double>(double.infinity,
        (a, b) => a < b.tempMin ? a : b.tempMin);
    final max = all.fold<double>(-double.infinity,
        (a, b) => a > b.tempMax ? a : b.tempMax);
    final span = (max - min).clamp(1.0, double.infinity);

    final left = ((d.tempMin - min) / span * 100).clamp(0.0, 100.0);
    final width = ((d.tempMax - d.tempMin) / span * 100).clamp(6.0, 100.0);

    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 74,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  i == 0 ? 'امروز' : Jalaali.formatShort(d.date),
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 4),
                Text(
                  UnitLabels.precipitation(d.precipitationSum),
                  style: const TextStyle(fontSize: 10),
                ),
              ],
            ),
          ),
          SizedBox(
            width: 26,
            child: CustomPaint(
              size: const Size(26, 34),
              painter: _DayIconPainter(d.condition, d.isDaySafe),
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 64,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${toPersianDigits(d.tempMin.toStringAsFixed(0))}°',
                  style: const TextStyle(fontSize: 12),
                ),
                const SizedBox(height: 2),
                Text(
                  '${toPersianDigits(d.tempMax.toStringAsFixed(0))}°',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: Container(
                  height: 6,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Container(
                    margin: EdgeInsets.only(left: left / 100 * 100),
                    width: width / 100 * 100,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(4),
                      gradient: const LinearGradient(
                        colors: [Color(0xFF7FC8FF), Color(0xFFFFC07A)],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

extension on DailyForecast {
  bool get isDaySafe => true;
}

class _DayIconPainter extends CustomPainter {
  final WeatherCondition condition;
  final bool isDay;
  _DayIconPainter(this.condition, this.isDay);

  @override
  void paint(Canvas canvas, Rect rect) {
    const cx = 13.0;
    const cy = 17.0;
    final s = 0.62;
    final paint = Paint()..color = Colors.white.withValues(alpha: 0.95);

    void cloud() {
      final w = 58 * s;
      for (final (ox, oy, r) in const [
        (-0.42, 0.0, 0.30),
        (-0.10, -0.20, 0.34),
        (0.14, -0.30, 0.36),
        (0.40, -0.06, 0.27),
        (0.02, 0.16, 0.33),
      ]) {
        canvas.drawCircle(uiOffset(cx + ox * w, cy + oy * w), r * w, paint);
      }
    }

    if (isDay && (condition == WeatherCondition.clear ||
        condition == WeatherCondition.mainlyClear)) {
      canvas.drawCircle(uiOffset(cx, cy), 6 * s * 0.9,
          Paint()..color = const Color(0xFFFFD166));
    } else if (!isDay &&
        (condition == WeatherCondition.clear ||
            condition == WeatherCondition.mainlyClear)) {
      canvas.drawCircle(uiOffset(cx, cy), 6 * s * 0.9,
          Paint()..color = const Color(0xFFF2F5FB));
    } else {
      cloud();
    }
  }

  @override
  bool shouldRepaint(covariant _DayIconPainter old) =>
      old.condition != condition || old.isDay != isDay;
}

/// arcِ خورشید: از طلوع تا غروب با positionِ فعلی.
class SunArc extends StatelessWidget {
  final DateTime sunrise;
  final DateTime sunset;
  final DateTime now;

  const SunArc({
    super.key,
    required this.sunrise,
    required this.sunset,
    required this.now,
  });

  @override
  Widget build(BuildContext context) {
    final t0 = sunrise.millisecondsSinceEpoch;
    final t1 = sunset.millisecondsSinceEpoch;
    final total = (t1 - t0).clamp(1, double.infinity);
    final k = ((now.millisecondsSinceEpoch - t0) / total).clamp(0.0, 1.0);

    return Row(
      children: [
        Icon(Icons.wb_twilight_rounded,
            size: 14, color: const Color(0xFFFFC07A)),
        const SizedBox(width: 6),
        Expanded(
          child: CustomPaint(
            painter: _SunArcPainter(k: k),
            size: const Size(160, 56),
          ),
        ),
        const SizedBox(width: 6),
        Icon(Icons.wb_cloudy_rounded,
            size: 14, color: const Color(0xFF7FC8FF)),
      ],
    );
  }
}

class _SunArcPainter extends CustomPainter {
  final double k;
  _SunArcPainter({required this.k});

  @override
  void paint(Canvas canvas, Rect rect) {
    final w = rect.width;
    final h = rect.height;
    final cx = w / 2;
    final base = h - 4;
    final radius = w * 0.44;

    canvas.drawArc(
        Rect.fromCenter(cx, base - radius * 0.18, radius * 2, radius * 2),
        math.pi,
        math.pi,
        false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3
          ..color = Colors.white.withValues(alpha: 0.28)
          ..strokeCap = StrokeCap.round);

    final angle = math.pi + k * math.pi;
    final x = cx + radius * math.cos(angle);
    final y = base - radius * 0.18 + radius * math.sin(angle);

    canvas.drawCircle(uiOffset(x, y), 9,
        Paint()..color = const Color(0xFFFFD166).withValues(alpha: 0.3));
    canvas.drawCircle(uiOffset(x, y), 6, Paint()..color = const Color(0xFFFFD166));
  }

  @override
  bool shouldRepaint(covariant _SunArcPainter old) => (old.k - k).abs() > 0.01;
}
