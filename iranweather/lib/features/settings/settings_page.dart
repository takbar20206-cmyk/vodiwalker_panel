import 'package:flutter/material.dart';

import 'package:iranweather/core/state/app_state.dart';
import 'package:iranweather/core/utils/persian_number.dart';
import 'package:iranweather/data/cities.dart';

/// تنظیمات: واحدها، اعداد فارسی، feedِ رعدوبرق، هشدارِ زلزله.
class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    return Scaffold(
      appBar: AppBar(title: const Text('تنظیمات')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 170),
          children: [
            _group(context, 'پیش‌خوان', [
              _switchRow(context, st, 'اعداد فارسی', st.persianNumbers,
                  (_) => st.persianNumbers = !st.persianNumbers),
              _switchRow(context, st, 'واحد metric (C، کیلومتر/ساعت)', st.metricUnits,
                  (_) => st.metricUnits = !st.metricUnits),
              const _DividerRow(),
              _infoRow('شهرهای موجود', toPersianDigits(allCities.length.toString())),
              _infoRow('استان‌های ایران', '۳۱'),
              _infoRow('منبعِ هواشناسی', 'Open-Meteo (آزاد)'),
              _infoRow('منبعِ زلزله', 'USGS / EMSC (آزاد)'),
              _infoRow('نقشه', 'GeoJSON استان‌های ایران'),
              _infoRow('فونت', 'Vazirmatn'),
            ]),
            const SizedBox(height: 24),
            _group(context, 'رعدوبرق', [
              _switchRow(context, st, 'فعال‌سازی feed زنده',
                  st.lightningFeedEnabled,
                  (_) => st.lightningFeedEnabled = !st.lightningFeedEnabled),
              TextField(
                controller: TextEditingController(text: st.lightningFeedUrl),
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  hintText: 'آدرس JSON feed — مثل https://...',
                  hintStyle: TextStyle(color: Color(0xFF8EA0C4)),
                  border: InputBorder.none,
                  filled: true,
                  fillColor: Color(0x0FFFFFFF),
                  prefixIcon: Icon(Icons.rss_feed_outlined, color: Color(0xFFA99BFF)),
                ),
                onChanged: (v) => st.lightningFeedUrl = v,
              ),
              const SizedBox(height: 8),
              const Text(
                ' formatคาด: [{"lat":..,"lon":..,"time":..,"energy":..}]',
                style: TextStyle(fontSize: 10, color: Color(0xFF8EA0C4)),
              ),
            ]),
            const SizedBox(height: 24),
            _group(context, 'هشدارها', [
              _switchRow(context, st, 'هشدار زلزله', st.earthquakeAlerts,
                  (_) => st.earthquakeAlerts = !st.earthquakeAlerts),
              const Text(
                'در صورتِ وقوع زلزلهٔ قوی در نزدیکی شهر، از طریقِ notify alert اطلاع‌رسانی می‌شود.',
                style: TextStyle(fontSize: 11, color: Color(0xFF8EA0C4)),
              ),
            ]),
            const SizedBox(height: 24),
            _group(context, 'درباره‌یِ آیرانا', [
              const Text(
                'آیرانا Airana — اپلیکیشن هواشناسی کامل ایران.\n'
                'هوا، زلزله، رعدوبرق، کیفیت هوا و تمامی شهرهای ایران.',
                style: TextStyle(fontSize: 12, height: 1.7),
              ),
            ]),
          ],
        ),
      ),
    );
  }

  Widget _group(BuildContext context, String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withValues(alpha: 0.10)),
          ),
          child: Column(children: children),
        ),
      ],
    );
  }

  Widget _switchRow(
      BuildContext context, AppState st, String label, bool value, void Function() onChanged) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 14))),
          Switch.adaptive(value: value, onChanged: onChanged),
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 14))),
          Text(value, style: const TextStyle(fontSize: 13, color: Color(0xFF9FC4FF))),
        ],
      ),
    );
  }

  class _DividerRow extends StatelessWidget {
    const _DividerRow();

    @override
    Widget build(BuildContext context) =>
        const Padding(padding: EdgeInsets.symmetric(vertical: 4), child: Divider(height: 1, color: Color(0x1AFFFFFF)));
  }
}
