import 'dart:async';

import 'package:flutter/material.dart';

import 'package:iranweather/core/models/city.dart';
import 'package:iranweather/core/models/earthquake_model.dart';
import 'package:iranweather/core/services/earthquake_service.dart';
import 'package:iranweather/core/state/app_state.dart';
import 'package:iranweather/core/utils/jalaali.dart';
import 'package:iranweather/core/utils/persian_number.dart';
import 'package:iranweather/data/map_data.dart';
import 'package:iranweather/shared/painters/iran_map_painter.dart';
import 'package:iranweather/shared/widgets/glass_card.dart';
import 'package:iranweather/shared/widgets/shimmer_box.dart';

/// صفحه‌ی زلزله‌ها: نقشهٔ ایران با نشانه‌هایِ زنده + لیستِ پائین‌ترین.
class EarthquakesPage extends StatefulWidget {
  const EarthquakesPage({super.key});

  @override
  State<EarthquakesPage> createState() => _EarthquakesPageState();
}

class _EarthquakesPageState extends State<EarthquakesPage> {
  List<Earthquake> _quakes = const [];
  List<ProvinceContour> _contours = const [];
  Future<void>? _future;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _contoursFuture = MapData.load().then(setState);
    _load();
  }

  late final Future<void> _contoursFuture;

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final list = await EarthquakeService.recent(limit: 200);
      if (!mounted) return;
      setState(() {
        _quakes = list;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('خطا در دریافت: $e')));
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    final last24 = DateTime.now().subtract(const Duration(hours: 24));
    final todays = _quakes.where((q) => q.time.isAfter(last24)).toList();
    final maxMag = todays.fold<double>(0, (a, b) => a > b.magnitude ? a : b.magnitude);

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.bolt_rounded,
                            color: Color(0xFFFF7A2E), size: 18),
                        const SizedBox(width: 6),
                        Text('لرزه‌های زمین',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                        const Spacer(),
                        IconButton(
                            icon: const Icon(Icons.refresh_rounded, size: 18),
                            onPressed: _load),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        _stat(toPersianDigits(todays.length), 'لرزه ۲۴ ساعته'),
                        const SizedBox(width: 12),
                        _stat(toPersianDigits(maxMag.toStringAsFixed(1)), 'بزرگترین M',
                            color: const Color(0xFFFF7A2E)),
                        const SizedBox(width: 12),
                        _stat(toPersianDigits(_quakes.length), 'در کل'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 6, 20, 10),
                child: Container(
                  height: 300,
                  decoration: BoxDecoration(
                    color: const Color(0x0FFFFFFF),
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(
                        color: Colors.white.withValues(alpha: 0.12)),
                  ),
                  child: Stack(
                    children: [
                      FutureBuilder<void>(
                        future: _contoursFuture,
                        builder: (context, snap) {
                          final contours = snap.data == null
                              ? const <ProvinceContour>[]
                              : _contours;
                          return CustomPaint(
                            painter: IranMapPainter(
                              contours: contours,
                              overlays: _overlays(st.city),
                              showLabels: true,
                            ),
                            size: Size.infinite,
                          );
                        },
                      ),
                      _mapHint(),
                    ],
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
                child: _legendRow(),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                child: Row(
                  children: [
                    Expanded(
                      child: Text('امروز',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    ),
                    Text(
                      '${Jalaali.formatYear(DateTime.now())}',
                      style: const TextStyle(fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, i) => _quakeTile(context, _quakes[i], st.city),
                childCount: _loading ? 4 : _quakes.length,
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 150)),
          ],
        ),
      ),
    );
  }

  Widget _stat(String v, String label, {Color color = Colors.white}) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(v,
              style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w300,
                  color: color)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 11)),
        ],
      ),
    );
  }

  Widget _mapHint() {
    return Positioned(
      left: 12,
      bottom: 10,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: const Color(0x22000000),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Text('منبع: USGS · محدودهٔ ایران',
            style: TextStyle(fontSize: 9)),
      ),
    );
  }

  Widget _legendRow() {
    final items = <(Color, String)>[
      (const Color(0xFF6EC5FF), 'M < 4'),
      (const Color(0xFFFFE557), '4 – 5'),
      (const Color(0xFFFFC400), '5 – 6'),
      (const Color(0xFFFF9500), '6 – 7'),
      (const Color(0xFFFF6B00), '7 – 8'),
      (const Color(0xFFFF3B3B), '≥ 8'),
    ];
    return Wrap(
      spacing: 12,
      children: [
        for (final (color, label) in items)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(5),
                ),
              ),
              const SizedBox(width: 4),
              Text(label, style: const TextStyle(fontSize: 10)),
            ],
          ),
      ],
    );
  }

  List<MapOverlay> _overlays(City city) {
    return [
      for (final q in _quakes.take(200))
        MapOverlay(
            lat: q.latitude,
            lon: q.longitude,
            r: 3 + q.magnitude * 2.6,
            color: (q.severityColor ?? Colors.white).withValues(alpha: 0.35),
            inner: q.severityColor ?? Colors.white,
            alpha: 1),
      MapOverlay(
        lat: city.lat,
        lon: city.lng,
        r: 9,
        color: const Color(0xFF7FC8FF),
        inner: const Color(0xFF0B1836),
      ),
    ];
  }

  Widget _quakeTile(BuildContext context, Earthquake q, City city) {
    final dist = q.distanceKmFrom(city.lat, city.lng);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            margin: const EdgeInsets.only(top: 2),
            decoration: BoxDecoration(
              color: (q.severityColor ?? Colors.white).withValues(alpha: 0.22),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                  color: (q.severityColor ?? Colors.white).withValues(alpha: 0.4)),
            ),
            child: Center(
              child: Text(
                toPersianDigits(q.magnitude.toStringAsFixed(1)),
                style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: q.severityColor),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(q.place.isNotEmpty ? q.place : 'ناشناس',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.timer_outline, size: 12),
                    const SizedBox(width: 4),
                    Text(
                      '${Jalaali.formatShort(q.time)} · ${q.network}',
                      style: const TextStyle(fontSize: 11),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _detailRow(q.depthKm, 'عمق', 'کیلومتر'),
                const SizedBox(height: 6),
                _detailRow(dist, 'فاصله', 'کیلومتر'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _detailRow(double value, String label, String unit) {
    return Row(
      children: [
        Text(toPersianDigits(value.toStringAsFixed(0)),
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        const SizedBox(width: 4),
        Text('$label $unit', style: const TextStyle(fontSize: 10)),
      ],
    );
  }
}
