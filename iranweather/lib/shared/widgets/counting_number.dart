import 'package:flutter/material.dart';

/// اعداد انیمیشنیک که به‌تدریج به هدف می‌رسند — برای دمای اصلی.
class CountingNumber extends StatefulWidget {
  final double value;
  final int decimals;
  final double durationMs;
  final TextStyle? style;
  final bool suffix;

  const CountingNumber({
    super.key,
    required this.value,
    this.decimals = 0,
    this.durationMs = 700,
    this.style,
    this.suffix = true,
  });

  @override
  State<CountingNumber> createState() => _CountingNumberState();
}

class _CountingNumberState extends State<CountingNumber>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: Duration(milliseconds: widget.durationMs))
        ..forward();
  late final Tween<double> _tween = Tween(begin: 0, end: widget.value);

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
        final v = _tween.evaluate(_c) ?? 0;
        return Text(
          '${v.toStringAsFixed(widget.decimals)}${widget.suffix ? '°' : ''}',
          style: widget.style,
        );
      },
      child: null,
    );
  }
}
