import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import 'package:iranweather/core/constants/weather_codes.dart';

/// نقاشی‌یِ iconهای انیمیشنیکِ هوا — بدون وابستگی به فایل svg.
///
/// هر وضعیت با ترکیبِ primitivesکشیده می‌شود:
/// خورشیدِ با شعاع‌هایِ چرخان، ماه، ابر puffy، باران، برف، رعدوبرق، تنبله.
class WeatherIconPainter extends CustomPainter {
  final WeatherCondition condition;
  final bool isDay;
  final double phase; // 0..1 for animation
  final double size;

  WeatherIconPainter({
    super.repaint,
    required this.condition,
    required this.isDay,
    required this.phase,
    this.size = 120,
  });

  @override
  void paint(ui.Canvas canvas, ui.Rect rect) {
    final cx = rect.center.dx;
    final cy = rect.center.dy;
    final s = size / 100;

    switch (condition) {
      case WeatherCondition.clear:
        if (isDay) _sun(canvas, cx, cy, 30 * s, phase, const Color(0xFFFFD166));
        else _moon(canvas, cx, cy, 30 * s, phase);
      case WeatherCondition.mainlyClear:
        if (isDay) {
          _sun(canvas, cx - 14 * s, cy - 16 * s, 20 * s, phase,
              const Color(0xFFFFD166));
        } else {
          _moon(canvas, cx - 14 * s, cy - 16 * s, 20 * s, phase);
        }
        _cloud(canvas, cx + 16 * s, cy + 20 * s, 0.72 * s, phase);
      case WeatherCondition.partlyCloudy:
        if (isDay) {
          _sun(canvas, cx - 20 * s, cy - 20 * s, 22 * s, phase,
              const Color(0xFFFFD166));
        } else {
          _moon(canvas, cx - 20 * s, cy - 20 * s, 22 * s, phase);
        }
        _cloud(canvas, cx + 20 * s, cy + 20 * s, 0.95 * s, phase);
      case WeatherCondition.overcast:
        _cloud(canvas, cx, cy + 4 * s, 1.25 * s, phase,
            shade: const Color(0xFF7E8CA8));
      case WeatherCondition.fog:
        _cloud(canvas, cx, cy - 14 * s, 1.05 * s, phase,
            shade: const Color(0xFF9AA5B4));
        _fogLines(canvas, cx, cy + 14 * s, 34 * s, phase);
      case WeatherCondition.drizzle:
        _cloud(canvas, cx, cy - 10 * s, 1.05 * s, phase);
        _rain(canvas, cx, cy + 16 * s, 30 * s, phase, drops: 3, light: true);
      case WeatherCondition.rain:
        _cloud(canvas, cx, cy - 12 * s, 1.1 * s, phase,
            shade: const Color(0xFF6B7C93));
        _rain(canvas, cx, cy + 18 * s, 30 * s, phase, drops: 4);
      case WeatherCondition.rainShowers:
        _cloud(canvas, cx - 8 * s, cy - 14 * s, 0.85 * s, phase);
        _sun(canvas, cx + 26 * s, cy - 26 * s, 14 * s, phase,
            const Color(0xFFFFD166));
        _rain(canvas, cx - 10 * s, cy + 18 * s, 26 * s, phase, drops: 3);
      case WeatherCondition.freezingRain:
        _cloud(canvas, cx, cy - 12 * s, 1.1 * s, phase,
            shade: const Color(0xFF8FA6BC));
        _rain(canvas, cx, cy + 18 * s, 30 * s, phase, drops: 3, light: true);
        _snowDot(canvas, cx + 10 * s, cy + 40 * s, 5 * s);
      case WeatherCondition.snow:
        _cloud(canvas, cx, cy - 12 * s, 1.05 * s, phase,
            shade: const Color(0xFF9FB2C8));
        _snow(canvas, cx, cy + 18 * s, 30 * s, phase, count: 4);
      case WeatherCondition.snowGrains:
        _cloud(canvas, cx, cy - 12 * s, 1.0 * s, phase,
            shade: const Color(0xFF9FB2C8));
        _snow(canvas, cx, cy + 18 * s, 26 * s, phase, count: 3);
      case WeatherCondition.snowShowers:
        _cloud(canvas, cx - 6 * s, cy - 14 * s, 0.8 * s, phase);
        _snow(canvas, cx - 8 * s, cy + 18 * s, 24 * s, phase, count: 3);
      case WeatherCondition.thunderstorm:
        _cloud(canvas, cx, cy - 10 * s, 1.15 * s, phase,
            shade: const Color(0xFF3B4358));
        _thunder(canvas, cx, cy + 16 * s, phase);
      case WeatherCondition.thunderstormHail:
        _cloud(canvas, cx, cy - 10 * s, 1.15 * s, phase,
            shade: const Color(0xFF2F3548));
        _thunder(canvas, cx, cy + 16 * s, phase);
        _snowDot(canvas, cx - 16 * s, cy + 40 * s, 5 * s);
        _snowDot(canvas, cx + 18 * s, cy + 44 * s, 4 * s);
    }
  }

  @override
  bool shouldRepaint(covariant WeatherIconPainter old) =>
      old.condition != condition || old.isDay != isDay || old.size != size;

  // ------------------------------------------------------------------ sun
  void _sun(ui.Canvas canvas, double cx, double cy, double r, double phase,
      Color color) {
    const rays = 8;
    final rot = phase * math.pi * 2;
    for (var i = 0; i < rays; i++) {
      final a = rot + i * (math.pi / 4);
      final x1 = cx + math.cos(a) * r * 0.95;
      final y1 = cy + math.sin(a) * r * 0.95;
      final x2 = cx + math.cos(a) * r * 1.42;
      final y2 = cy + math.sin(a) * r * 1.42;
      final paint = Paint()
        ..style = ui.PaintingStyle.stroke
        ..strokeWidth = r * 0.14
        ..strokeCap = ui.StrokeCap.round
        ..color = color.withValues(alpha: 0.9);
      canvas.drawLine(ui.Offset(x1, y1), ui.Offset(x2, y2), paint);
    }
    canvas.drawCircle(
        ui.Offset(cx, cy), r * 0.68,
        Paint()..color = color.withValues(alpha: 0.35));
    canvas.drawCircle(ui.Offset(cx, cy), r * 0.5,
        Paint()..color = color);
  }

  // ------------------------------------------------------------------ moon
  void _moon(ui.Canvas canvas, double cx, double cy, double r, double phase) {
    final bob = math.sin(phase * math.pi * 2) * r * 0.06;
    canvas.drawCircle(
        ui.Offset(cx, cy + bob), r * 0.72,
        Paint()..color = const Color(0xFFF2F5FB));
    // قطعه‌ی پشت
    final offset = ui.Offset(cx + r * 0.34, cy - r * 0.12 + bob);
    canvas.drawCircle(offset, r * 0.6,
        Paint()..color = const Color(0xFF0B1836));
    // craters
    for (final (ox, oy, or) of const [
      (-0.16, -0.22, 0.1),
      (0.1, 0.16, 0.13),
      (-0.24, 0.2, 0.08),
    ]) {
      canvas.drawCircle(
          ui.Offset(cx + r * ox, cy + r * oy + bob),
          r * or,
          Paint()..color = const Color(0xFFD8DFEC).withValues(alpha: 0.7));
    }
  }

  // ------------------------------------------------------------------ cloud
  void _cloud(ui.Canvas canvas, double cx, double cy, double scale,
      double phase, {Color? shade}) {
    final base = const Color(0xFFFFFFFF);
    final color = shade ?? base;
    final w = 58 * scale;
    final bob = math.sin(phase * math.pi * 2) * scale * 2.0;

    final puffs = <(double x, double y, double r)>[
      (-w * 0.42, bob, w * 0.30),
      (-w * 0.10, bob - w * 0.20, w * 0.34),
      (w * 0.14, bob - w * 0.30, w * 0.36),
      (w * 0.40, bob - w * 0.06, w * 0.27),
      (w * 0.02, bob + w * 0.16, w * 0.33),
    ];
    for (final (x, y, r) in puffs) {
      canvas.drawCircle(ui.Offset(cx + x, cy + y), r,
          Paint()..color = color.withValues(alpha: 0.96));
    }
    // زیرِ ابر — خط ملایم
    canvas.drawRRect(
        ui.RRect.fromRectAndRadius(
            ui.Rect.fromCenter(cx, cy + bob + w * 0.14, w * 0.98, w * 0.26),
            w * 0.13),
        Paint()..color = color.withValues(alpha: 0.9));

    // سایه ملایم
    canvas.drawRRect(
        ui.RRect.fromRectAndRadius(
            ui.Rect.fromCenter(cx, cy + bob + w * 0.44, w * 0.7, w * 0.12),
            w * 0.06),
        Paint()
          ..color = const Color(0x0D000000)
          ..style = ui.PaintingStyle.fill);
  }

  // ------------------------------------------------------------------ rain
  void _rain(ui.Canvas canvas, double cx, double cy, double w, double phase,
      {int drops = 4, bool light = false}) {
    final span = w * 0.9;
    final speed = light ? 0.5 : 1.0;
    final alpha = light ? 0.75 : 0.95;
    final length = light ? 11 : 15;
    final paint = Paint()
      ..style = ui.PaintingStyle.stroke
      ..strokeWidth = light ? 2.0 : 2.8
      ..strokeCap = ui.StrokeCap.round
      ..color = const Color(0xFFA8D4FF).withValues(alpha: alpha);

    for (var i = 0; i < drops; i++) {
      final t = (phase + i / drops) % 1.0;
      final x = cx - span / 2 + (i + 0.5) * (span / drops);
      final y = cy + t * length * speed * 2.2;
      final slope = 0.30;
      canvas.drawLine(
          ui.Offset(x, y),
          ui.Offset(x - slope * length * 0.5, y + length),
          paint);
    }
  }

  // ------------------------------------------------------------------ snow
  void _snow(ui.Canvas canvas, double cx, double cy, double w, double phase,
      {int count = 4}) {
    final span = w * 0.95;
    for (var i = 0; i < count; i++) {
      final t = (phase + i / count) % 1.0;
      final x = cx - span / 2 + (i + 0.5) * (span / count) +
          math.sin(t * math.pi * 4 + i) * 3;
      final y = cy + t * 26;
      _snowDot(canvas, x, y, 5.2, 1.0);
    }
  }

  void _snowDot(ui.Canvas canvas, double x, double y, double r,
      {double alpha = 1.0}) {
    final paint = Paint()..color = const Color(0xFFFFFFFF).withValues(
        alpha: alpha);
    canvas.drawCircle(ui.Offset(x, y), r, paint);
    for (var i = 0; i < 6; i++) {
      final a = i * (math.pi / 3);
      canvas.drawLine(
          ui.Offset(x + math.cos(a) * r, y + math.sin(a) * r),
          ui.Offset(
              x + math.cos(a) * r * 1.7, y + math.sin(a) * r * 1.7),
          paint..strokeWidth = 1.3
            ..style = ui.PaintingStyle.stroke);
    }
  }

  // ------------------------------------------------------------------ thunder
  void _thunder(ui.Canvas canvas, double cx, double cy, double phase) {
    // אלי وليسِ flash ریزی: با احتمال بالا بر سطحِ canvas می‌تابد
    final flash = (math.sin(phase * math.pi * 4) * 0.5 + 0.5);
    final paint = Paint()
      ..style = ui.PaintingStyle.stroke
      ..strokeWidth = 3.2
      ..strokeCap = ui.StrokeCap.round
      ..strokeJoin = ui.StrokeJoin.round
      ..color = const Color(0xFFFFE066).withValues(alpha: 0.9);

    final path = ui.Path()
      ..moveTo(cx + 4, cy)
      ..lineTo(cx - 6, cy + 12)
      ..lineTo(cx + 1, cy + 12)
      ..lineTo(cx - 3, cy + 26)
      ..lineTo(cx + 12, cy + 7)
      ..lineTo(cx + 3, cy + 7)
      ..lineTo(cx + 9, cy)
      ..close();
    canvas.drawPath(path, paint);

    // بريقِ رعد
    if (flash > 0.86) {
      canvas.drawPath(path, Paint()
        ..style = ui.PaintingStyle.stroke
        ..strokeWidth = 9
        ..color = const Color(0xFFFFFFFF).withValues(alpha: 0.55 * flash));
    }
  }

  // ------------------------------------------------------------------ fog
  void _fogLines(ui.Canvas canvas, double cx, double cy, double w,
      double phase) {
    final paint = Paint()
      ..style = ui.PaintingStyle.stroke
      ..strokeWidth = 3.4
      ..strokeCap = ui.StrokeCap.round
      ..color = const Color(0xFFC6D0DC).withValues(alpha: 0.8);
    final ys = [0, 8, 16];
    for (var i = 0; i < ys.length; i++) {
      final t = (phase + i / ys.length) % 1.0;
      final shift = (t - 0.5) * w * 0.5;
      final s = i == 0 ? w * 0.62 : i == 1 ? w * 0.78 : w * 0.5;
      canvas.drawLine(
          ui.Offset(cx - s / 2 + shift, cy + ys[i]),
          ui.Offset(cx + s / 2 + shift, cy + ys[i]),
          paint);
    }
  }
}
