import 'package:flutter_test/flutter_test.dart';

import 'package:iranweather/core/models/city.dart';
import 'package:iranweather/data/cities.dart';

void main() {
  test('لیست شهرها complete است', () {
    expect(allCities.length, greaterThan(700));
  });

  test('۳۱ استان وجود دارند', () {
    expect(allProvinces.length, 31);
  });

  test('هر استان مرکز دارد', () {
    for (final p in allProvinces) {
      expect(p.capital.province, p.name);
      expect(p.count, greaterThan(1));
    }
  });

  test('تهران، مشهد و شیراز در لیست هستند', () {
    final names = allCities.map((c) => c.name).toSet();
    expect(names, contains('تهران'));
    expect(names, contains('مشهد'));
    expect(names, contains('شیراز'));
  });

  test('جستجو با فارسی کار می‌کند', () {
    final r = searchCities('تهران');
    expect(r, isNotEmpty);
    expect(r.first.name, contains('تهران'));
  });

  test('جستجو با انگلیسی کار می‌کند', () {
    final r = searchCities('tehran');
    expect(r, isNotEmpty);
  });

  test('فاصله‌ی Stadt می‌تواند محاسبه شود', () {
    final tehran = allCities.firstWhere((c) => c.name == 'تهران');
    final arak = allCities.firstWhere((c) => c.name == 'اراک');
    final d = tehran.distanceTo(arak.lat, arak.lng);
    expect(d, greaterThan(100));
    expect(d, lessThan(300));
  });
}
