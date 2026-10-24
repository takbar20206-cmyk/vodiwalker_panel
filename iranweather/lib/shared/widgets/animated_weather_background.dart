import 'dart:async';

import 'package:flutter/material.dart';

import 'package:iranweather/core/constants/weather_codes.dart';
import 'package:iranweather/shared/painters/weather_scene_painter.dart';

/// زمینه‌ی انیمیشنیکِ هوا با ticker منظم و cacheِ painter.
///
/// یک Timer یک‌ثانیا painter راinvalid می‌کند تا صحنه زنده بماند.
class AnimatedWeatherBackground extends StatefulWidget {
  final WeatherSceneConfig config;
  final Widget child;

  const AnimatedWeatherBackground({
    super.key,
    required this.config,
    required this.child,
  });

  @override
  State<AnimatedWeatherBackground> createState() =>
      _AnimatedWeatherBackgroundState();
}

class _AnimatedWeatherBackgroundState extends State<AnimatedWeatherBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 100))
        ..repeat();

  WeatherScenePainter? _painter;

  @override
  void initState() {
    super.initState();
    _painter = WeatherScenePainter(
      repaint: this,
      config: widget.config,
      reference: DateTime.now(),
    );
  }

  @override
  void didUpdateWidget(covariant _AnimatedWeatherBackground old) {
    super.didUpdateWidget(old);
    if (old.config.condition != widget.config.condition ||
        old.config.isDay != widget.config.isDay ||
        old.config.sunElevation != widget.config.sunElevation ||
        old.config.now != widget.config.now) {
      _painter = WeatherScenePainter(
        repaint: this,
        config: widget.config,
        reference: DateTime.now(),
      );
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (context, child) {
        _painter = WeatherScenePainter(
          repaint: this,
          config: widget.config,
          reference: DateTime.now(),
        );
        return Stack(
          fit: StackFit.expand,
          children: [
            RepaintBoundary(
              child: CustomPaint(painter: _painter, size: MediaQuery.of(context).size),
            ),
            SafeArea(
              child: Align(
                alignment: Alignment.topLeft,
                child: widget.child,
              ),
            ),
          ],
        );
      },
      child: null,
    );
  }
}

/// نوار gradientِ ساده در ته‌صفحه.
class BottomFade extends StatelessWidget {
  final Color color;

  const BottomFade({super.key, required this.color});

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      child: Container(
        height: 140,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.bottomCenter,
            end: Alignment.topCenter,
            colors: [
              color.withValues(alpha: 0.5),
              color.withValues(alpha: 0.0),
            ],
          ),
        ),
      ),
    );
  }
}
