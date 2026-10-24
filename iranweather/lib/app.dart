import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:iranweather/core/state/app_state.dart';
import 'package:iranweather/data/cities.dart';
import 'package:iranweather/features/cities/cities_page.dart';
import 'package:iranweather/features/earthquakes/earthquakes_page.dart';
import 'package:iranweather/features/home/home_page.dart';
import 'package:iranweather/features/lightning/lightning_page.dart';
import 'package:iranweather/features/map/iran_weather_map_page.dart';
import 'package:iranweather/features/settings/settings_page.dart';

/// شیء‌یِ root: providerِ AppState + navigationِ پایین.
class AiranaApp extends StatefulWidget {
  const AiranaApp({super.key});

  @override
  State<AiranaApp> createState() => _AiranaAppState();
}

class _AiranaAppState extends State<AiranaApp> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState(city: teheran),
      child: Scaffold(
        resizeToAvoidBottomInset: true,
        body: const _Shell(),
        bottomNavigationBar: _BottomNav(
          index: _index,
          onChanged: (i) => setState(() => _index = i),
        ),
      ),
    );
  }
}

/// IndexedStackِ صفحات.
class _Shell extends StatelessWidget {
  const _Shell();

  @override
  Widget build(BuildContext context) {
    return const IndexedStack(
      index: 0,
      children: [
        HomePage(),
        EarthquakesPage(),
        LightningPage(),
        IranWeatherMapPage(),
        CitiesPage(),
        SettingsPage(),
      ],
    );
  }
}

/// navigationِ پایین.
class _BottomNav extends StatelessWidget {
  final int index;
  final ValueChanged<int> onChanged;

  const _BottomNav({required this.index, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    const items = <(IconData, String)>[
      (Icons.cloud_queue_rounded, 'هوا'),
      (Icons.earthquake_service_rounded, 'زلزله'),
      (Icons.flashlight_on_rounded, 'رعد'),
      (Icons.map_outlined, 'نقشه'),
      (Icons.location_city_rounded, 'شهر'),
      (Icons.settings_rounded, 'تنظیم'),
    ];

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      padding: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0x14FFFFFF),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.white.withValues(alpha: 0.16)),
        boxShadow: const [
          BoxShadow(
              color: Color(0x1A000000), blurRadius: 24, offset: Offset(0, 10)),
        ],
      ),
      child: Row(
        children: [
          for (var i = 0; i < items.length; i++)
            Expanded(
              child: InkWell(
                onTap: () => onChanged(i),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      items[i].$1,
                      size: 22,
                      color: index == i
                          ? const Color(0xFFFFFFFF)
                          : const Color(0xFF7E8CA8),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      items[i].$2,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: index == i ? FontWeight.w700 : FontWeight.w400,
                        color: index == i
                            ? Colors.white
                            : const Color(0xFF7E8CA8),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
