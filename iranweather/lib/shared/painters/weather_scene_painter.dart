import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import 'package:iranweather/core/constants/weather_codes.dart';

/// داده‌های لازم برای نقاشیِ صحنه‌ی آسمان.
@immutable
class WeatherSceneConfig {
  final WeatherCondition condition;
  final bool isDay;
  final double sunElevation;
  final DateTime sunrise;
  final DateTime sunset;
  final DateTime now;

  const WeatherSceneConfig({
    required this.condition,
    required this.isDay,
    required this.sunElevation,
    required this.sunrise,
    required this.sunset,
    required this.now,
  });

  SkyPalette get palette => SkyPalettes.resolve(
        condition: condition,
        isDay: isDay,
        sunElevation: sunElevation,
      );
}

/// نقاشی‌یِ پشت‌صحنه‌ی انیمیشنیکِ هوا.
///
/// انیمیشن کامل: gradient آسمان، ستاره‌ها، خورشید با شعاع‌هایِ چرخان،
/// ماه، ابرهای در حال حرکت، باران، برف، تنبله و رعدوبرقِ براق.
///
/// همه‌چیز بر اساس زمانِ حال در insideِ نقاشی محاسبه می‌شود، بنابراین
/// صحنه همیشهanimated است بدون نیاز به controller.
class WeatherScenePainter extends CustomPainter {
  final WeatherSceneConfig config;
  final DateTime reference;

  WeatherScenePainter({super.repaint, required this.config, required this.reference});

  @override
  void paint(ui.Canvas canvas, ui.Rect rect) {
    final size = rect.size;
    final palette = config.palette;
    final t = reference.millisecondsSinceEpoch / 1000.0;

    _sky(canvas, rect, palette);
    _celestial(canvas, rect, palette, t);
    _stars(canvas, rect, palette, t);

    switch (config.condition) {
      case WeatherCondition.clear:
        _clouds(canvas, rect, palette, t, density: 0.35);
      case WeatherCondition.mainlyClear:
        _clouds(canvas, rect, palette, t, density: 0.6);
      case WeatherCondition.partlyCloudy:
        _clouds(canvas, rect, palette, t, density: 0.95);
      case WeatherCondition.overcast:
        _clouds(canvas, rect, palette, t, density: 1.6, layered: true);
      case WeatherCondition.fog:
        _clouds(canvas, rect, palette, t, density: 0.5, low: true);
        _fogBands(canvas, rect, palette, t);
      case WeatherCondition.drizzle:
        _clouds(canvas, rect, palette, t, density: 1.3, dark: true);
        _rain(canvas, rect, palette, t, drops: 90, intensity: 0.6);
      case WeatherCondition.rain:
        _clouds(canvas, rect, palette, t, density: 1.5, dark: true);
        _rain(canvas, rect, palette, t, drops: 160, intensity: 1.0);
      case WeatherCondition.rainShowers:
        _clouds(canvas, rect, palette, t, density: 1.1, dark: true);
        _rain(canvas, rect, palette, t, drops: 110, intensity: 0.85);
      case WeatherCondition.freezingRain:
        _clouds(canvas, rect, palette, t, density: 1.2, dark: true);
        _rain(canvas, rect, palette, t, drops: 130, intensity: 0.9);
      case WeatherCondition.snow:
        _clouds(canvas, rect, palette, t, density: 1.0);
        _snow(canvas, rect, t, count: 140);
      case WeatherCondition.snowGrains:
        _clouds(canvas, rect, palette, t, density: 0.9);
        _snow(canvas, rect, t, count: 90);
      case WeatherCondition.snowShowers:
        _clouds(canvas, rect, palette, t, density: 0.9);
        _snow(canvas, rect, t, count: 110);
      case WeatherCondition.thunderstorm:
        _storm(canvas, rect, palette, t, hail: false);
      case WeatherCondition.thunderstormHail:
        _storm(canvas, rect, palette, t, hail: true);
    }

    // vignette ملایم برای تمرکز روی کارت‌ها
    _vignette(canvas, rect);
  }

  @override
  bool shouldRepaint(covariant WeatherScenePainter old) =>
      old.config.condition != config.condition ||
      old.config.isDay != config.isDay ||
      old.config.sunElevation != config.sunElevation;

  // ------------------------------------------------------------------ sky
  void _sky(ui.Canvas canvas, ui.Rect rect, SkyPalette p) {
    final grad = ui.Gradient.linear(
        ui.Offset(0, rect.top), ui.Offset(0, rect.bottom), p.stops);
    canvas.drawRect(rect, Paint()..shader = grad);

    // نور اینفرادردی در پایینِ صفحه
    final glow = ui.Gradient.radial(
        ui.Offset(rect.center.dx, rect.bottom * 1.15),
        rect.width * 0.9,
        [
          p.glow.withValues(alpha: 0.55),
          p.glow.withValues(alpha: 0.0),
        ]);
    canvas.drawPaint(Paint()..shader = glow);
  }

  // ------------------------------------------------------------------ sun / moon
  void _celestial(ui.Canvas canvas, ui.Rect rect, SkyPalette p, double t) {
    final elevation = config.sunElevation;

    if (elevation > -12 && elevation < 90) {
    // موقعیتِ منظری خورشید: بالایِ خطِ افقِ canvas
      final horizon = rect.top + rect.height * 0.94;
      final screenY =
          horizon - math.tan(math.max(0.0, elevation) * math.pi / 180) *
              rect.height * 0.34;
      final cx = rect.center.dx;
      final r = rect.width * 0.085;

      final visible = elevation > 0;
      final alpha = visible
          ? (0.35 + 0.65 * math.clamp(elevation / 24, 0, 1))
          : 0.0;

      if (alpha > 0.02) {
        // halo
        canvas.drawCircle(ui.Offset(cx, screenY), r * 3.4,
            Paint()
              ..color = p.glow.withValues(alpha: 0.16 * alpha));
        canvas.drawCircle(ui.Offset(cx, screenY), r * 2.2,
            Paint()..color = p.glow.withValues(alpha: 0.22 * alpha));

        // rays
        const rays = 12;
        final rot = t * 0.00035;
        for (var i = 0; i < rays; i++) {
          final a = rot + i * (math.pi * 2 / rays);
          final x1 = cx + math.cos(a) * r * 1.25;
          _ray(canvas, x1, screenY, r, a, alpha, p);
        }

        canvas.drawCircle(ui.Offset(cx, screenY), r,
            Paint()..color = p.glow.withValues(alpha: alpha));
        canvas.drawCircle(ui.Offset(cx, screenY), r * 0.82,
            Paint()..color = const Color(0xFFFFF3D6).withValues(alpha: alpha));
      }
    }

    // ماه — در شبِ صاف
    if (!config.isDay && (config.condition == WeatherCondition.clear ||
        config.condition == WeatherCondition.mainlyClear)) {
      final cx = rect.center.dx * 1.06;
      final cy = rect.top + rect.height * 0.24;
      final r = rect.width * 0.075;
      canvas.drawCircle(ui.Offset(cx, cy), r * 2.6,
          Paint()..color = const Color(0xFFC7D5F5).withValues(alpha: 0.12));
      canvas.drawCircle(ui.Offset(cx, cy), r * 1.7,
          Paint()..color = const Color(0xFFD9E2F7).withValues(alpha: 0.16));
      canvas.drawCircle(ui.Offset(cx, cy), r,
          Paint()..color = const Color(0xFFF2F6FD));
      canvas.drawCircle(ui.Offset(cx + r * 0.32, cy - r * 0.1), r * 0.88,
          Paint()..color = const Color(0xFF0B1836));
      for (final (ox, oy, or) of const [
        (-0.14, -0.2, 0.09),
        (0.08, 0.18, 0.12),
        (-0.22, 0.18, 0.07),
      ]) {
        canvas.drawCircle(
            ui.Offset(cx + r * ox, cy + r * oy), r * or,
            Paint()..color = const Color(0xFFDCE4F2).withValues(alpha: 0.7));
      }
    }
  }

  void _ray(ui.Canvas canvas, double x, double y, double r, double a,
      double alpha, SkyPalette p) {
    final x2 = x + math.cos(a) * r * 2.1;
    final y2 = y + math.sin(a) * r * 2.1;
    canvas.drawLine(
        ui.Offset(x, y), ui.Offset(x2, y2),
        Paint()
          ..style = ui.PaintingStyle.stroke
          ..strokeWidth = r * 0.1
          ..strokeCap = ui.StrokeCap.round
          ..color = p.glow.withValues(alpha: 0.35 * alpha));
  }

  // ------------------------------------------------------------------ stars
  void _stars(ui.Canvas canvas, ui.Rect rect, SkyPalette p, double t) {
    if (config.isDay) return;
    final paint = Paint()..color = const Color(0xFFFFFFFF);
    for (var i = 0; i < 90; i++) {
      final seed = i * 4831.0;
      final x = rect.left + (math.sin(seed) * 0.5 + 0.5) * rect.width;
      final y = rect.top + (math.cos(seed * 1.7) * 0.5 + 0.5) *
          rect.height * 0.62;
      final tw = 0.5 + 0.5 * math.sin(t * 0.0019 + seed);
      canvas.drawCircle(ui.Offset(x, y), 0.9 + tw * 1.3,
          paint..color = const Color(0xFFFFFFFF).withValues(alpha: 0.25 + tw * 0.75));
    }
  }

  // ------------------------------------------------------------------ clouds
  void _clouds(ui.Canvas canvas, ui.Rect rect, SkyPalette p, double t,
      {double density = 1.0, bool layered = false, bool dark = false,
      bool low = false}) {
    final count = (8 * density).round();
    final baseTint = dark
        ? p.mid.withValues(alpha: 0.94)
        : const Color(0xFFFFFFFF).withValues(alpha: 0.86);

    for (var i = 0; i < count; i++) {
      final seed = i * 977.3 + 13.0;
      final speed = 0.000018 * (layered ? 0.5 : 1.0) * (1 + (i % 3) * 0.35);
      final offset = (t * speed + math.sin(seed) * 0.5 + 0.5) *
          (rect.width * (layered ? 2.4 : 1.7));
      final x = (rect.left + offset) % (rect.width * (layered ? 2.4 : 1.7)) -
          rect.width * 0.1;
      final yBase = low
          ? rect.top + rect.height * (0.35 + 0.3 * ((i * 0.618) % 1))
          : rect.top + rect.height * (0.04 + 0.32 * ((i * 0.754) % 1));
      final scale = rect.width * (0.10 + 0.09 * ((i * 0.337) % 1)) * density;
      _drawCloud(canvas, x, yBase, scale, baseTint,
          alpha: dark ? 0.9 : 0.75 + 0.2 * ((i * 0.41) % 1));
    }
  }

  void _drawCloud(ui.Canvas canvas, double cx, double cy, double scale,
      Color color, {double alpha = 0.8}) {
    final w = scale * 1.15;
    final paint = Paint()..color = color.withValues(alpha: alpha);
    for (final (ox, oy, r) in const [
      (-0.42, 0.0, 0.30),
      (-0.10, -0.20, 0.34),
      (0.14, -0.30, 0.36),
      (0.40, -0.06, 0.27),
      (0.02, 0.16, 0.33),
    ]) {
      canvas.drawCircle(ui.Offset(cx + ox * w, cy + oy * w), r * w, paint);
    }
    canvas.drawRRect(
        ui.RRect.fromRectAndRadius(
            ui.Rect.fromCenter(cx, cy + 0.14 * w, 0.98 * w, 0.26 * w),
            0.13 * w),
        Paint()..color = color.withValues(alpha: alpha * 0.95));
  }

  // ------------------------------------------------------------------ rain
  void _rain(ui.Canvas canvas, ui.Rect rect, SkyPalette p, double t,
      {int drops = 120, double intensity = 1.0}) {
    const dropSpan = 0.0085; // spacing
    final spanX = rect.width * 1.05;
    final fall = rect.height * (0.55 * intensity + 0.5);
    final len = rect.width * 0.022 * (0.8 + intensity * 0.7);
    final slope = 0.22;

    final paint = Paint()
      ..style = ui.PaintingStyle.stroke
      ..strokeWidth = 1.5 + intensity * 0.9
      ..strokeCap = ui.StrokeCap.round
      ..color = const Color(0xFFBFE2FF).withValues(alpha: 0.45 + intensity * 0.4);

    final step = spanX / drops;
    for (var i = 0; i < drops; i++) {
      final x = rect.left + (i * step) % spanX;
      final seed = i * 0.37;
      final phase = (t * 0.00105 * (0.8 + (seed % 1) * 0.5) + seed * 0.13) % 1.0;
      final y = rect.top - len * 2 + phase * fall;
      canvas.drawLine(
          ui.Offset(x, y),
          ui.Offset(x - slope * len * 0.4, y + len),
          paint);
    }
  }

  // ------------------------------------------------------------------ snow
  void _snow(ui.Canvas canvas, ui.Rect rect, double t, {int count = 120}) {
    final span = rect.width * 1.1;
    final fall = rect.height * 1.05;
    final paint = Paint()..color = const Color(0xFFFFFFFF).withValues(alpha: 0.85);
    final step = span / count;
    for (var i = 0; i < count; i++) {
      final x = rect.left - span * 0.05 + (i * step) % span;
      final seed = i * 0.618;
      final phase = (t * 0.00042 * (0.7 + (seed % 1) * 0.6) + seed * 0.21) % 1.0;
      final y = rect.top - 20 + phase * fall;
      final drift = math.sin(t * 0.0009 + seed * 3.0) * rect.width * 0.02;
      final r = 1.6 + 2.4 * ((seed % 1));
      canvas.drawCircle(ui.Offset(x + drift, y), r, paint);
    }
  }

  // ------------------------------------------------------------------ storm
  void _storm(ui.Canvas canvas, ui.Rect rect, SkyPalette p, double t,
      {bool hail = false}) {
    _clouds(canvas, rect, p, t, density: 1.9, layered: true, dark: true);

    // باران سنگین
    _rain(canvas, rect, p, t, drops: 200, intensity: 1.35);

    // رعدوبرقِلرزنده
    for (var i = 0; i < 6; i++) {
      final seed = i * 7.3 + 3.1;
      final period = 5.5 + (seed % 5);
      _flash(canvas, rect, t, seed, period, p, hail);
    }

    if (hail) {
      final paint = Paint()..color = const Color(0xFFFFFFFF).withValues(alpha: 0.6);
      for (var i = 0; i < 40; i++) {
        final seed = i * 3.7;
        final phase = (t * 0.0008 + seed * 0.11) % 1.0;
        final x = rect.left + (math.sin(seed * 2.1) * 0.5 + 0.5) * rect.width;
        final y = rect.top + phase * rect.height * 0.85;
        canvas.drawCircle(ui.Offset(x, y), 1.8 + 1.4 * (seed % 1), paint);
      }
    }
  }

  void _flash(ui.Canvas canvas, ui.Rect rect, double t, double seed,
      double period, SkyPalette p, bool hail) {
    final phase = (t * 0.0007 + seed * 0.15) % period;
    final flash = phase > period * 0.88;
    if (!flash) return;
    final x = rect.left + (math.sin(seed * 1.7) * 0.5 + 0.5) * rect.width;
    final y = rect.top + rect.height * 0.30;
    final paint = Paint()
      ..style = ui.PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = ui.StrokeCap.round
      ..color = const Color(0xFFFFF3C0).withValues(alpha: 0.9);

    final path = ui.Path()
      ..moveTo(x + 5, y)
      ..lineTo(x - 9, y + 20)
      ..lineTo(x + 2, y + 20)
      ..lineTo(x - 5, y + 42)
      ..lineTo(x + 18, y + 11)
      ..lineTo(x + 4, y + 11)
      ..lineTo(x + 14, y)
      ..close();
    canvas.drawPath(path, paint);
    canvas.drawPath(path, Paint()
      ..style = ui.PaintingStyle.stroke
      ..strokeWidth = 14
      ..color = const Color(0xFFFFFFFF).withValues(alpha: 0.30));

    // کنکرشتِ سراسریِ صفحه
    if (hail) {
      canvas.drawColor(
          p.top.withValues(alpha: 0.28),
          ui.BlendMode.src);
    }
  }

  // ------------------------------------------------------------------ fog
  void _fogBands(ui.Canvas canvas, ui.Rect rect, SkyPalette p, double t) {
    final paint = Paint()
      ..style = ui.PaintingStyle.stroke
      ..strokeWidth = 26
      ..strokeCap = ui.StrokeCap.round
      ..color = const Color(0xFFFFFFFF).withValues(alpha: 0.13);
    for (var i = 0; i < 5; i++) {
      final seed = i * 2.4;
      final y = rect.top + rect.height * (0.28 + 0.16 * i) +
          math.sin(t * 0.0003 + seed) * 10;
      final w = rect.width * (0.55 + 0.35 * ((seed % 1)));
      final shift = (t * 0.00009 * (i + 1) * (i % 2 == 0 ? 1 : -1) % 1.0) *
          rect.width * 0.3;
      canvas.drawLine(
          ui.Offset(rect.left + shift, y),
          ui.Offset(rect.left + shift + w, y),
          paint);
    }
  }

  // ------------------------------------------------------------------ vignette
  void _vignette(ui.Canvas canvas, ui.Rect rect) {
    final grad = ui.Gradient.radial(
        ui.Offset(rect.center.dx, rect.center.dy * 0.62),
        rect.height * 0.85,
        [
          const Color(0x00000000),
          const Color(0x33000000),
        ]);
    canvas.drawPaint(Paint()..shader = grad);
  }
}
