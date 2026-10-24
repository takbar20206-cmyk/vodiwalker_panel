import 'dart:async';

import 'package:flutter/material.dart';

import 'package:iranweather/core/constants/weather_codes.dart';
import 'package:iranweather/core/models/weather_models.dart';
import 'package:iranweather/core/services/air_quality_service.dart';
import 'package:iranweather/core/services/weather_service.dart';
import 'package:iranweather/core/state/app_state.dart';
import 'package:iranweather/core/utils/jalaali.dart';
import 'package:iranweather/core/utils/persian_number.dart';
import 'package:iranweather/shared/widgets/animated_weather_background.dart';
import 'package:iranweather/shared/widgets/glass_card.dart';
import 'package:iranweather/shared/widgets/shimmer_box.dart';

import 'home_widgets.dart';

/// صفحه‌ی اصلی:อากาศِ جاری، شاخص‌ها، ساعت‌های آینده و ۷ روز پیش‌بینی.
class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  WeatherReport? _report;
  Map<String, double>? _aqi;
  Future<void>? _future;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // هر زمان شهری تغییر کرد، داده‌ها reload می‌شوند.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final state = context.read<AppState>();
      _load(city: state.city);
    });
  }

  Future<void> _load({City? city}) async {
    final st = context.read<AppState>();
    final c = city ?? st.city;
    setState(() {
      _error = null;
      _future = null;
    });
    try {
      final report = await WeatherService.forecast(
        lat: c.lat,
        lng: c.lng,
        airQuality: false,
      );
      if (!mounted) return;
      setState(() {
        _report = report;
      });

      try {
        final aqi = await AirQualityService.fetch(lat: c.lat, lng: c.lng);
        if (!mounted) return;
        setState(() => _aqi = aqi);
      } catch (_) {
        // کیفیت هوا optional است.
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'درخواست ناموفق بود. $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    final report = _report;
    final lat = st.city.lat;
    final lng = st.city.lng;

    return Scaffold(
      body: AnimatedWeatherBackground(
        config: _sceneConfig(report, lat, lng),
        child: SafeArea(
          bottom: false,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _header(context, st.city)),
              if (_error != null) _errorBanner(),
              SliverToBoxAdapter(
                child: report == null
                    ? _loadingBody()
                    : _body(context, report, st.city, _aqi),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 150)),
            ],
          ),
        ),
      ),
    );
  }

  WeatherSceneConfig _sceneConfig(WeatherReport? r, double lat, double lng) {
    final now = DateTime.now();
    final cond = r?.current.condition ?? WeatherCondition.clear;
    final isDay = r?.current.isDay ?? true;
    final sunrise = r?.daily.isNotEmpty == true
        ? r!.daily.first.sunrise
        : now.subtract(const Duration(hours: 7));
    final sunset = r?.daily.isNotEmpty == true
        ? r!.daily.first.sunset
        : now.add(const Duration(hours: 7));
    return WeatherSceneConfig(
      condition: cond,
      isDay: isDay,
      sunElevation: _elevation(sunrise, sunset, now),
      sunrise: sunrise,
      sunset: sunset,
      now: now,
    );
  }

  double _elevation(DateTime sr, DateTime ss, DateTime now) {
    final k = ((now.millisecondsSinceEpoch - sr.millisecondsSinceEpoch) /
            (ss.millisecondsSinceEpoch - sr.millisecondsSinceEpoch))
        .clamp(0.0, 1.0);
    return math.sin(k * math.pi) * 80 - 6;
  }

  Widget _header(BuildContext context, City city) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(city.province,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w400)),
                    const SizedBox(width: 6),
                    const Icon(Icons.chevron_right, size: 14),
                    const SizedBox(width: 6),
                    Text(city.name,
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w600)),
                  ],
                ),
              ],
            ),
          ),
          IconButton(
              icon: const Icon(Icons.my_location_rounded, size: 20),
              onPressed: () => _locate(context)),
          IconButton(
              icon: const Icon(Icons.more_vert_rounded, size: 20),
              onPressed: () => _more(context)),
        ],
      ),
    );
  }

  Future<void> _locate(BuildContext context) async {
    final st = context.read<AppState>();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const Scaffold(
          body: Center(child: Text('دریافتِ موقعیت...')),
        ),
      ),
    );
    final result = await LocationService.current();
    if (!mounted) return;
    if (result.precise && result.city != null) {
      st.city = result.city!;
    }
    Navigator.of(context).pop();
  }

  void _more(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => const MoreSheet(),
    );
  }

  Widget _loadingBody() {
    return const Padding(
      padding: EdgeInsets.fromLTRB(20, 8, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(height: 130, child: ShimmerBox(height: 130)),
          SizedBox(height: 16),
          SizedBox(height: 120, child: ShimmerBox(height: 120)),
          SizedBox(height: 16),
          SizedBox(height: 90, child: ShimmerBox(height: 90)),
        ],
      ),
    );
  }

  Widget _errorBanner() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFFF4D4D).withValues(alpha: 0.18),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: const Color(0xFFFF4D4D).withValues(alpha: 0.4)),
        ),
        child: Row(
          children: [
            const Icon(Icons.cloud_off_rounded,
                color: Color(0xFFFF8A8A), size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(_error ?? 'خطا', style: const TextStyle(fontSize: 12)),
            ),
            TextButton(
                onPressed: () => _load(),
                child: const Text('تلاش دوباره')),
          ],
        ),
      ),
    );
  }

  Widget _body(
      BuildContext context, WeatherReport report, City city, Map<String, double>? aqi) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GlassCard(
            margin: const EdgeInsets.zero,
            child: CurrentHero(
              current: report.current,
              cityName: city.name,
              cityProvince: city.province,
              sunrise: report.daily.isNotEmpty ? report.daily.first.sunrise : report.current.time,
              sunset: report.daily.isNotEmpty ? report.daily.first.sunset : report.current.time,
            ),
          ),
          const SizedBox(height: 14),
          _dangerCard(context, report),
          const SizedBox(height: 14),
          GlassCard(
            margin: const EdgeInsets.zero,
            padding: const EdgeInsets.fromLTRB(6, 14, 6, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.speed, size: 15, color: Color(0xFFFFC07A)),
                    const SizedBox(width: 6),
                    Text('شاخص‌های هوا',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    const Spacer(),
                    Text(
                      '${toPersianDigits(DateTime.now().hour.toString().padLeft(2, '0'))}:${toPersianDigits(DateTime.now().minute.toString().padLeft(2, '0'))}',
                      style: const TextStyle(fontSize: 11),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(height: 92, child: MetricGrid(current: report.current)),
              ],
            ),
          ),
          const SizedBox(height: 14),
          if (aqi != null) _aqiCard(aqi),
          const SizedBox(height: 14),
          _hourlyCard(context, report),
          const SizedBox(height: 14),
          _sunCard(context, report),
          const SizedBox(height: 14),
          _dailyCard(context, report),
        ],
      ),
    );
  }

  Widget _dangerCard(BuildContext context, WeatherReport report) {
    final score = dangerScore(report.current.condition);
    if (score < 2) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFFFF4D4D).withValues(alpha: 0.28),
            const Color(0xFFFF9E2C).withValues(alpha: 0.14),
          ],
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
            color: const Color(0xFFFF4D4D).withValues(alpha: 0.45)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded, color: Color(0xFFFFB020), size: 26),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_dangerTitle(report.current.condition),
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                const SizedBox(height: 3),
                Text(_dangerText(report.current.condition),
                    style: const TextStyle(fontSize: 11, height: 1.5)),
              ],
            ),
          ),
          IconButton(
              icon: const Icon(Icons.notifications_active_outlined, size: 18),
              onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('هشدار فعال شد'))),
              visualDensity: VisualDensity.compact),
        ],
      ),
    );
  }

  String _dangerTitle(WeatherCondition c) => switch (c) {
        WeatherCondition.thunderstorm => 'رعدوبرق پیش رو',
        WeatherCondition.thunderstormHail => 'رعدوبرق و تگرگ',
        WeatherCondition.rain => 'بارش شدید',
        WeatherCondition.rainShowers => 'باران‌های رگباری',
        WeatherCondition.snow => 'بارش برف',
        WeatherCondition.snowShowers => 'برف‌سالی',
        WeatherCondition.freezingRain => 'باران یخی',
        WeatherCondition.drizzle => 'جوهره',
        WeatherCondition.fog => 'تنبله',
        _ => '',
      };

  String _dangerText(WeatherCondition c) => switch (c) {
        WeatherCondition.thunderstorm =>
            'از زیرِrgbاب مستحمل شوید و ازพื้นที่‌های باز دور شوید.',
        WeatherCondition.thunderstormHail =>
            'تگرگ پیش رو — خودرو را در پوشش قرار دهید.',
        WeatherCondition.rain =>
            'بارش شدید باعث لغزش زمین می‌تواند شود.',
        WeatherCondition.snow => 'مسیرهای کوهستانی لغزنده است.',
        _ => 'از activités‌های بیرونی قایم شوید.',
      };

  Widget _aqiCard(Map<String, double> aqi) {
    final value = aqi['europeanAqi']?.round() ?? 0;
    final color = _aqiColor(value);
    return GlassCard(
      margin: const EdgeInsets.zero,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.28),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: color.withValues(alpha: 0.5)),
            ),
            child: const Icon(Icons.air, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      toPersianDigits(value.toString()),
                      style: const TextStyle(
                          fontSize: 20, fontWeight: FontWeight.w600),
                    ),
                    Text(' / ۱۰۰', style: const TextStyle(fontSize: 12)),
                  ],
                ),
                const SizedBox(height: 2),
                Text(_aqiLabel(value), style: const TextStyle(fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'PM2.5  ' +
                    toPersianDigits(
                        (aqi['pm25'] ?? 0).toStringAsFixed(0)),
                style: const TextStyle(fontSize: 11),
              ),
              const SizedBox(height: 2),
              Text(
                'PM10  ' +
                    toPersianDigits(
                        (aqi['pm10'] ?? 0).toStringAsFixed(0)),
                style: const TextStyle(fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color _aqiColor(int v) => switch (v) {
        <= 20 => const Color(0xFF5BE38B),
        <= 40 => const Color(0xFFFFE066),
        <= 60 => const Color(0xFFFFB020),
        <= 80 => const Color(0xFFFF7A2E),
        _ => const Color(0xFFFF4D4D),
      };

  String _aqiLabel(int v) => switch (v) {
        <= 20 => 'عادی',
        <= 40 => 'مناسب',
        <= 60 => 'متوسط',
        <= 80 => 'نامناسب',
        _ => 'خطرناک',
      };

  Widget _hourlyCard(BuildContext context, WeatherReport report) {
    return GlassCard(
      margin: const EdgeInsets.zero,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.schedule_rounded,
                  size: 15, color: Color(0xFF7FC8FF)),
              const SizedBox(width: 6),
              Text('۲۴ ساعتِ آینده',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              const Spacer(),
              Text('نور \u200e', style: const TextStyle(fontSize: 10)),
            ],
          ),
          const SizedBox(height: 12),
          HourlyStrip(hourly: report.hourly, now: report.current.time),
        ],
      ),
    );
  }

  Widget _sunCard(BuildContext context, WeatherReport report) {
    final d = report.daily.isNotEmpty ? report.daily.first : null;
    if (d == null) return const SizedBox.shrink();
    return GlassCard(
      margin: const EdgeInsets.zero,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('طلوع و غروب',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 10),
          SunArc(sunrise: d.sunrise, sunset: d.sunset, now: d.date),
          const SizedBox(height: 10),
          Row(
            children: [
              _sunTime(d.sunrise, 'طلوع'),
              const SizedBox(width: 16),
              _sunTime(d.sunset, 'غروب'),
              const Spacer(),
              Text(
                'تابش  ' +
                    toPersianDigits(
                        (d.sunshineDuration / 3600).toStringAsFixed(1)) +
                    ' h',
                style: const TextStyle(fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _sunTime(DateTime t, String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(Jalaali.formatShort(t),
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        Text(label, style: const TextStyle(fontSize: 10)),
      ],
    );
  }

  Widget _dailyCard(BuildContext context, WeatherReport report) {
    return GlassCard(
      margin: const EdgeInsets.zero,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              children: [
                const Icon(Icons.calendar_month_rounded,
                    size: 15, color: Color(0xFFFFC07A)),
                const SizedBox(width: 6),
                Text('هفته‌ی پیش رو',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const Spacer(),
                Text('${Jalaali.formatYear(report.daily.first.date)}',
                    style: const TextStyle(fontSize: 11)),
              ],
            ),
          ),
          const SizedBox(height: 10),
          DailyStrip(daily: report.daily),
        ],
      ),
    );
  }
}

/// sheet برای دسترسی سریع به بخش‌ها.
class MoreSheet extends StatelessWidget {
  const MoreSheet({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _row(context, Icons.earthquake_service_rounded, 'زلزله‌ها',
              () => Navigator.of(context).pop(true)),
          const SizedBox(height: 10),
          _row(context, Icons.flashlight_on_rounded, 'رعدوبرق',
              () => Navigator.of(context).pop(true)),
          const SizedBox(height: 10),
          _row(context, Icons.public_rounded, 'نقشه‌ی ایران',
              () => Navigator.of(context).pop(true)),
          const SizedBox(height: 10),
          _row(context, Icons.location_city_rounded, 'انتخاب شهر',
              () => Navigator.of(context).pop(true)),
          const SizedBox(height: 10),
          _row(context, Icons.settings_rounded, 'تنظیمات',
              () => Navigator.of(context).pop(true)),
        ],
      ),
    );
  }

  Widget _row(BuildContext context, IconData icon, String label, VoidCallback onTap) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(16),
            border:
                Border.all(color: Colors.white.withValues(alpha: 0.14)),
          ),
          child: Row(
            children: [
              Icon(icon, color: const Color(0xFF9FC4FF), size: 20),
              const SizedBox(width: 14),
              Expanded(child: Text(label, style: const TextStyle(fontSize: 15))),
              const Icon(Icons.chevron_right, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}
