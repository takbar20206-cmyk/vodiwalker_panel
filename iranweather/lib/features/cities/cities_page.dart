import 'package:flutter/material.dart';

import 'package:iranweather/core/models/city.dart';
import 'package:iranweather/core/state/app_state.dart';
import 'package:iranweather/core/utils/persian_number.dart';
import 'package:iranweather/data/cities.dart';
import 'package:iranweather/core/services/location_service.dart';

/// انتخاب شهر: جستجو + لیستِ تمام استان‌ها و شهرهای ایران.
class CitiesPage extends StatefulWidget {
  const CitiesPage({super.key});

  @override
  State<CitiesPage> createState() => _CitiesPageState();
}

class _CitiesPageState extends State<CitiesPage> {
  final _controller = TextEditingController();
  List<City> _results = const [];
  List<City> _all = const [];
  List<List<City>> _groups = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _all = allCities;
    _groups = LocationServiceGroup.group();
    _results = allCities.where((c) => c.capital).take(31).toList();
    _loading = false;
    _controller.addListener(_onSearch);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onSearch() {
    final q = _controller.text;
    if (q.trim().isEmpty) {
      setState(() => _results = const []);
      return;
    }
    setState(() => _results = searchCities(q));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _controller,
          style: const TextStyle(color: Colors.white),
          textAlign: TextAlign.start,
          decoration: InputDecoration(
            hintText: 'جستجوی شهر — مثل تهران، مشهد، شیراز',
            hintStyle: const TextStyle(color: Color(0xFF8EA0C4)),
            border: InputBorder.none,
            prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF8EA0C4)),
            suffixIcon: ValueListenableBuilder<TextEditingValue>(
              valueListenable: _controller,
              builder: (context, value, child) =>
                  value.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.close_rounded, size: 18),
                          onPressed: () => _controller.clear(),
                        )
                      : null,
            ),
            filled: true,
            fillColor: Colors.white.withValues(alpha: 0.06),
          ),
        ),
        actions: [
          IconButton(
              icon: const Icon(Icons.add_location_alt_outlined, size: 20),
              onPressed: _useMyLocation),
        ],
      ),
      body: _controller.text.trim().isNotEmpty
          ? _searchResults()
          : _allCities(),
    );
  }

  Future<void> _useMyLocation() async {
    final st = context.read<AppState>();
    final result = await LocationService.current();
    if (!mounted) return;
    if (result.precise && result.city != null) {
      st.city = result.city!;
      Navigator.of(context).pop();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('دریافتِ موقعیت ممکن نشد.')));
    }
  }

  Widget _searchResults() {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 170),
      itemCount: _results.length,
      separatorBuilder: (_, __) => const Divider(height: 1, color: Color(0x1AFFFFFF)),
      itemBuilder: (context, i) => _cityTile(_results[i], _results[i]),
    );
  }

  Widget _allCities() {
    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 12),
      itemCount: _groups.length,
      separatorBuilder: (_, __) => const SizedBox(height: 18),
      itemBuilder: (context, i) {
        final group = _groups[i];
        final province = group.first.province;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                '$province (${toPersianDigits(group.length.toString())})',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: (group.length * 58).clamp(0, 520),
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: group.length,
                separatorBuilder: (_, __) =>
                    const SizedBox(height: 6),
                itemBuilder: (context, j) => _cityTile(group[j], group[j]),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _cityTile(BuildContext context, City city) {
    final st = context.read<AppState>();
    final isCurrent = st.city.id == city.id;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () {
          st.city = city;
          if (mounted) Navigator.of(context).pop();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: isCurrent
                ? const Color(0xFF1E5AA8).withValues(alpha: 0.35)
                : Colors.white.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
                color: isCurrent
                    ? const Color(0xFF7FC8FF).withValues(alpha: 0.6)
                    : Colors.white.withValues(alpha: 0.10)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(city.name,
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                        ),
                        if (city.capital)
                          const Padding(
                            padding: EdgeInsets.only(left: 6),
                            child: Icon(Icons.chair_auto_outline,
                                size: 12, color: Color(0xFFFFE066)),
                          ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(city.province, style: const TextStyle(fontSize: 11)),
                  ],
                ),
              ),
              if (isCurrent)
                const Icon(Icons.check_circle, color: Color(0xFF7FC8FF), size: 18),
            ],
          ),
        ),
      ),
    );
  }
}

/// دسترسی به LocationService از این فایل.
abstract final class LocationServiceGroup {
  static List<List<City>> group() => _grouped ??= _compute();
  static List<List<City>>? _grouped;

  static List<List<City>> _compute() {
    final map = <String, List<City>>{};
    for (final c in allCities) {
      map.putIfAbsent(c.province, () => []);
      map[c.province]!.add(c);
    }
    return map.values
        .toList()
        ..sort((a, b) => a.first.province.compareTo(b.first.province));
  }
}
