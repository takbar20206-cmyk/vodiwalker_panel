import 'dart:async';

import 'package:flutter/material.dart';

import 'package:iranweather/core/constants/weather_codes.dart';
import 'package:iranweather/core/models/city.dart';
import 'package:iranweather/core/services/weather_service.dart';
import 'package:iranweather/core/state/app_state.dart';
import 'package:iranweather/core/utils/persian_number.dart';
import 'package:iranweather/data/cities.dart';
import 'package:iranweather/data/map_data.dart';
import 'package:iranweather/shared/painters/iran_map_painter.dart';
import 'package:iranweather/shared/widgets/shimmer_box.dart';

/// نقشهٔ هواشناسی ایران: دمای هر استان + بقیه‌یِ شاخص‌ها.
class IranWeatherMapPage extends StatefulWidget {
  const IranWeatherMapPage({super.key});

  @override
  State<IranWeatherMapPage> createState() => _IranWeatherMapPageState();
}

class _IranWeatherMapPageState extends State<IranWeatherMapPage> {
  List<ProvinceContour> _contours = const [];
  Map<int, double> _temps = const {};
  Map<int, WeatherCondition> _conds = const {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    MapData.load().then((c) {
      if (!mounted) return;
      setState(() => _contours = c);
    });
    _fetchCities();
  }

  Future<void> _fetchCities() async {
    // ۳۱ شهرِ مرکز استان — demandes سبک و parallel.
    final capitals = allCities.where((c) => c.capital).toList();
    final results = <MapEntry<int, double>>[];
    final conds = <MapEntry<int, WeatherCondition>>[];

    await Future.wait(
      capitals.map((c) async {
        try {
          final r = await WeatherService.forecast(lat: c.lat, lng: c.lng);
          results.add(MapEntry(c.id, r.current.temperature));
          conds.add(MapEntry(c.id, r.current.condition));
        } catch (_) {}
      }),
    );

    if (!mounted) return;
    setState(() {
      _temps = Map.fromEntries(results);
      _conds = Map.fromEntries(conds);
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 8),
                child: Row(
                  children: [
                    const Icon(Icons.map_outlined,
                        color: Color(0xFF7FC8FF), size: 20),
                    const SizedBox(width: 6),
                    Text('نقشه‌ی هواشناسی ایران',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                    const Spacer(),
                    Text(
                      '${toPersianDigits(_temps.length.toString())} شهر',
                      style: const TextStyle(fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                child: _legend(),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                child: Container(
                  height: 340,
                  decoration: BoxDecoration(
                    color: const Color(0x0FFFFFFF),
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(
                        color: Colors.white.withValues(alpha: 0.12)),
                  ),
                  child: _loading
                      ? const ShimmerBox(height: 340, radius: 22)
                      : CustomPaint(
                          painter: IranMapPainter(
                            contours: _contours,
                            overlays: _overlays(st.city),
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
                child: Text('دمای هر استان',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              ),
            ),
            SliverGrid.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 0.62,
              ),
              itemCount: _temps.entries.length,
              itemBuilder: (context, i) => _cityTile(_temps.entries.elementAt(i).value,
                  _conds.entries.elementAt(i).value),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 150)),
          ],
        ),
      ),
    );
  }

  Widget _legend() {
    return Wrap(
      spacing: 14,
      children: [
        for (final (color, label) in [
          (const Color(0xFF7FC8FF), 'مستقیماً سرد'),
          (const Color(0xFFA8D4FF), 'کمی سرد'),
          (const Color(0xFFFFE066), 'ملایم'),
          (const Color(0xFFFFC07A), 'گرم'),
          (const Color(0xFFFF7A2E), 'بسیار گرم'),
        ])
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(4),
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
      for (final entry in _temps.entries)
        for (final c in allCities)
          if (c.id == entry.key)
            MapOverlay(
                lat: c.lat,
                lon: c.lng,
                r: 11 + (entry.value / 45).clamp(0.0, 1.0) * 8,
                color: _tempColor(entry.value),
                inner: const Color(0xFF0B1836),
                alpha: 0.85),
      MapOverlay(
        lat: city.lat,
        lon: city.lng,
        r: 10,
        color: const Color(0xFFFFFFFF),
        inner: const Color(0xFF1E5AA8),
      ),
    ];
  }

  Color _tempColor(double t) => switch (t) {
        <= 0 => const Color(0xFF7FC8FF),
        <= 10 => const Color(0xFFA8D4FF),
        <= 20 => const Color(0xFFFFE066),
        <= 30 => const Color(0xFFFFC07A),
        <= 40 => const Color(0xFFFF7A2E),
        _ => const Color(0xFFFF4D4D),
      };

  Widget _cityTile(double temp, WeatherCondition cond) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(toPersianDigits(temp.toStringAsFixed(0)) + '°',
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w500)),
              const Spacer(),
              _condDot(cond),
            ],
          ),
          const SizedBox(height: 4),
          Text(conditionFa(cond), style: const TextStyle(fontSize: 10)),
        ],
      ),
    );
  }

  Widget _condDot(WeatherCondition c) {
    return Container(
      width: 16,
      height: 16,
      decoration: BoxDecoration(
        color: SkyPalettes.resolve(condition: c, isDay: true).accent.withValues(alpha: 0.3),
        shape: BoxShape.circle,
        border: Border.all(
            color: SkyPalettes.resolve(condition: c, isDay: true).accent),
      ),
    );
  }
}
