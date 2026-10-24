import 'dart:async';

import 'package:flutter/material.dart';

import 'package:iranweather/core/models/city.dart';
import 'package:iranweather/core/models/lightning_model.dart';
import 'package:iranweather/core/services/lightning_service.dart';
import 'package:iranweather/core/state/app_state.dart';
import 'package:iranweather/core/utils/jalaali.dart';
import 'package:iranweather/core/utils/persian_number.dart';
import 'package:iranweather/data/map_data.dart';
import 'package:iranweather/shared/painters/iran_map_painter.dart';

/// صفحه‌ی رعدوبرق: نقشهٔ ایران با strikeهایِ زنده + آمار.
class LightningPage extends StatefulWidget {
  const LightningPage({super.key});

  @override
  State<LightningPage> createState() => _LightningPageState();
}

class _LightningPageState extends State<LightningPage> {
  LightningSummary? _summary;
  Future<void>? _future;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _load();
    });
  }

  Future<void> _load() async {
    final st = context.read<AppState>();
    setState(() => _loading = true);
    try {
      final s = await LightningService.fetch(
        lat: st.city.lat,
        lng: st.city.lng,
        feedUrl: st.lightningFeedEnabled ? st.lightningFeedUrl : null,
      );
      if (!mounted) return;
      setState(() {
        _summary = s;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    final summary = _summary;

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 8),
                child: Row(
                  children: [
                    const Icon(Icons.flashlight_on_rounded,
                        color: Color(0xFFA99BFF), size: 20),
                    const SizedBox(width: 6),
                    Text('رعدوبرق',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                    const Spacer(),
                    _liveBadge(summary?.live ?? false),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                child: _stats(summary),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                child: Container(
                  height: 300,
                  decoration: BoxDecoration(
                    color: const Color(0x0FFFFFFF),
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(
                        color: Colors.white.withValues(alpha: 0.12)),
                  ),
                  child: CustomPaint(
                    painter: IranMapPainter(
                      contours: _contours,
                      overlays: _overlays(st.city, summary),
                      showLabels: true,
                    ),
                    size: Size.infinite,
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Text('کار hard‌های اخیر',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    ),
                    Text(
                      summary == null ? '' : toPersianDigits(summary.strikes24h.toString()),
                      style: const TextStyle(fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, i) => _strikeTile(context, summary!.recent[i], st.city),
                childCount: _loading || summary == null ? 3 : summary.recent.length,
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 150)),
          ],
        ),
      ),
    );
  }

  Widget _liveBadge(bool live) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: live
            ? const Color(0xFF5BE38B).withValues(alpha: 0.22)
            : const Color(0xFFFFB020).withValues(alpha: 0.22),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: (live
                    ? const Color(0xFF5BE38B)
                    : const Color(0xFFFFB020))
                .withValues(alpha: 0.45)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _pulse(live ? const Color(0xFF5BE38B) : const Color(0xFFFFB020)),
          const SizedBox(width: 5),
          Text(live ? 'live' : 'simulated',
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _pulse(Color color) {
    return TweenAnimationBuilder<double>(
      tween: const Tween(begin: 6, end: 12),
      duration: const Duration(milliseconds: 900),
      curve: const Curves.easeInOut,
      builder: (context, value, child) => Container(
        width: value,
        height: value,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
        ),
      ),
    );
  }

  Widget _stats(LightningSummary? s) {
    final level = s?.level ?? 0;
    final levelColor = switch (level) {
      3 => const Color(0xFFFF4D4D),
      2 => const Color(0xFFFFB020),
      1 => const Color(0xFFFFE066),
      _ => const Color(0xFF5BE38B),
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                levelColor.withValues(alpha: 0.30),
                levelColor.withValues(alpha: 0.08),
              ],
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: levelColor.withValues(alpha: 0.45)),
          ),
          child: Row(
            children: [
              Icon(Icons.lightning_bolt_rounded,
                  color: levelColor, size: 26),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(s?.levelLabel ?? 'در حال بارگذاری',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text(
                      s?.live == true
                          ? 'منبع: feed زنده'
                          : 'منبع: شبیه‌سازِ storm (بر اساس بارش واقعی)',
                      style: const TextStyle(fontSize: 11),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            _stat(toPersianDigits(s?.strikes24h.toString() ?? '۰'), 'رعدوبرق ۲۴ ساعته'),
            const SizedBox(width: 12),
            _stat(toPersianDigits(s?.strikesActive.toString() ?? '۰'), 'فعال') ,
            const SizedBox(width: 12),
            _stat(
                toPersianDigits((s?.maxDistanceKm ?? 0).toStringAsFixed(0)), 'فاصله',
                color: const Color(0xFFA99BFF)),
          ],
        ),
      ],
    );
  }

  Widget _stat(String v, String label, {Color color = Colors.white}) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(v,
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w300, color: color)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 10)),
        ],
      ),
    );
  }

  List<MapOverlay> _overlays(City city, LightningSummary? s) {
    return [
      for (final strike in s?.recent ?? const [])
        MapOverlay(
          lat: strike.latitude,
          lon: strike.longitude,
          r: 4 + strike.energy / 25,
          color: const Color(0xFFFFE066).withValues(alpha: 0.30),
          inner: const Color(0xFFFFF3C0),
        ),
      MapOverlay(
        lat: city.lat,
        lon: city.lng,
        r: 9,
        color: const Color(0xFF7FC8FF),
        inner: const Color(0xFF0B1836),
      ),
    ];
  }

  Widget _strikeTile(BuildContext context, LightningStrike strike, City city) {
    final dist = strike.distanceKmFrom(city.lat, city.lng);
    return Container(
      margin: const EdgeInsets.only(bottom: 9),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            margin: const EdgeInsets.only(top: 2),
            decoration: BoxDecoration(
              color: const Color(0xFFFFE066).withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(11),
              border: Border.all(
                  color: const Color(0xFFFFE066).withValues(alpha: 0.4)),
            ),
            child: const Icon(Icons.lightning_bolt,
                color: Color(0xFFFFE066), size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${toPersianDigits(strike.latitude.toStringAsFixed(2))}، '
                  '${toPersianDigits(strike.longitude.toStringAsFixed(2))}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 3),
                Text(
                  '${Jalaali.formatShort(strike.time)} · شدت ${toPersianDigits(strike.energy.toString())}',
                  style: const TextStyle(fontSize: 10),
                ),
                const SizedBox(height: 4),
                Text(
                  '${toPersianDigits(dist.toStringAsFixed(0))} کیلومتر',
                  style: const TextStyle(fontSize: 10),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
