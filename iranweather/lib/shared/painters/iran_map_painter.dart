import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import 'package:iranweather/data/map_data.dart';

/// نقاشیِ نقشهٔ استان‌های ایران با نشانه‌های overlay.
///
/// تمام contourها با normalizing coordinates به [0..1] تبدیل می‌شوند،
/// بنابراین اندازه‌ی canvas مهم نیست.
class IranMapPainter extends CustomPainter {
  final List<ProvinceContour> contours;
  final List<MapOverlay> overlays;
  final Color fill;
  final Color stroke;
  final bool showLabels;

  IranMapPainter({
    super.repaint,
    required this.contours,
    required this.overlays,
    this.fill = const Color(0x16FFFFFF),
    this.stroke = const Color(0x4DFFFFFF),
    this.showLabels = false,
  });

  @override
  void paint(ui.Canvas canvas, ui.Rect rect) {
    final bbox = _bbox();
    if (bbox == null) return;

    final sx = rect.width / (bbox.width + 0.001);
    final sy = rect.height / (bbox.height + 0.001);
    final ox = -bbox.left * sx;
    final oy = -bbox.top * sy;

    // پاک‌سازی background
    canvas.drawColor(const Color(0xFF070B16), ui.BlendMode.src);

    // شبکه‌یِ ملایم
    _grid(canvas, rect, sx, sy, ox, oy);

    for (final c in contours) {
      for (final ring in c.rings) {
        final path = ui.Path();
        for (var i = 0; i < ring.length; i++) {
          final p = ring[i];
          final x = p.dx * sx + ox;
          final y = p.dy * sy + oy;
          if (i == 0) path.moveTo(x, y);
          else path.lineTo(x, y);
        }
        path.close();
        canvas.drawPath(path, Paint()
          ..color = fill
          ..style = ui.PaintingStyle.fill);
        canvas.drawPath(path, Paint()
          ..color = stroke
          ..style = ui.PaintingStyle.stroke
          ..strokeWidth = 0.8);
      }
    }

    // overlayها
    for (final o in overlays) {
      final x = o.lon * sx + ox;
      final y = o.lat * sy + oy;
      if (!rect.contains(ui.Offset(x, y))) continue;
      canvas.drawCircle(ui.Offset(x, y), o.r,
          Paint()..color = o.color.withValues(alpha: o.alpha));
      if (o.r > 8) {
        canvas.drawCircle(ui.Offset(x, y), o.r * 0.45,
            Paint()..color = o.inner);
      }
    }

    if (showLabels) {
      _labels(canvas, rect, sx, sy, ox, oy);
    }
  }

  void _grid(ui.Canvas canvas, ui.Rect rect, double sx, double sy,
      double ox, double oy) {
    final paint = Paint()
      ..color = const Color(0x0DFFFFFF)
      ..style = ui.PaintingStyle.stroke
      ..strokeWidth = 0.5;
    for (var i = 44; i <= 54; i += 2) {
      final x = i * sx + ox;
      canvas.drawLine(ui.Offset(x, rect.top), ui.Offset(x, rect.bottom), paint);
    }
    for (var i = 26; i <= 42; i += 3) {
      final y = i * sy + oy;
      canvas.drawLine(ui.Offset(rect.left, y), ui.Offset(rect.right, y), paint);
    }
  }

  void _labels(ui.Canvas canvas, ui.Rect rect, double sx, double sy,
      double ox, double oy) {
    canvas.drawRRect(
        ui.RRect.fromRectAndRadius(
            ui.Rect.fromCenter(rect.center.dx, rect.bottom - 12, 60, 18), 6),
        Paint()..color = const Color(0x14000000));
    final tf = ui.TextPainter(
      text: const TextSpan(
        text: 'IR',
        style: TextStyle(color: Color(0x66FFFFFF), fontSize: 10),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    tf.paint(canvas, ui.Offset(rect.center.dx - tf.width / 2, rect.bottom - 16));
  }

  Rect? _bbox() {
    if (contours.isEmpty) return null;
    double minX = double.infinity, minY = double.infinity;
    double maxX = -double.infinity, maxY = -double.infinity;
    for (final c in contours) {
      for (final ring in c.rings) {
        for (final p in ring) {
          if (p.dx < minX) minX = p.dx;
          if (p.dx > maxX) maxX = p.dx;
          if (p.dy < minY) minY = p.dy;
          if (p.dy > maxY) maxY = p.dy;
        }
      }
    }
    if (maxX == -double.infinity) return null;
    return Rect.fromLTWH(minX, minY, maxX - minX, maxY - minY);
  }

  @override
  bool shouldRepaint(covariant IranMapPainter old) =>
      old.contours.length != contours.length ||
      old.overlays.length != overlays.length;
}

/// یک نشانه‌یِ روی نقشه.
@immutable
class MapOverlay {
  final double lat;
  final double lon;
  final double r;
  final Color color;
  final Color inner;
  final double alpha;

  const MapOverlay({
    required this.lat,
    required this.lon,
    required this.r,
    required this.color,
    required this.inner,
    this.alpha = 1,
  });
}

/// ساختِ نشانه‌یِ ساده.
MapOverlay overlay({
  required double lat,
  required double lon,
  required double r,
  required Color color,
  Color inner = Colors.white,
  double alpha = 1,
}) =>
    MapOverlay(
        lat: lat,
        lon: lon,
        r: r,
        color: color,
        inner: inner,
        alpha: alpha);
