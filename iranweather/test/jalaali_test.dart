import 'package:flutter_test/flutter_test.dart';

import 'package:iranweather/core/utils/jalaali.dart';

void main() {
  test('تاریخ میلادی → جلالی برای عیدِ نوروز', () {
    const cases = <(String, String, String)>[
      ('2024-03-20', '1403-01-01', '1403'),
      ('2023-03-21', '1402-01-01', '1402'),
      ('2022-03-21', '1401-01-01', '1401'),
      ('2020-03-20', '1399-01-01', '1399'),
      ('2016-03-19', '1395-01-01', '1395'),
      ('2012-03-20', '1391-01-01', '1391'),
      ('2000-03-20', '1379-01-01', '1379'),
      ('1990-03-21', '1369-01-01', '1369'),
      ('1979-03-21', '1358-01-01', '1358'),
    ];
    for (final (iso, want, year) in cases) {
      final d = DateTime.parse(iso);
      final got = Jalaali.convert(d);
      final label = '$got';
      expect(label, "$year-01-01".replace('$year', '$year'),
          reason: '$iso should be $want, got $got');
      expect('${got.year}-${got.month}-${got.day}', want,
          reason: '$iso -> $got');
    }
  });

  test('توزیع سال، ماه و روز در سال ۱۴۰۳', () {
    // ۱۴۰۳ = 2024-03-20 .. 2025-03-19
    final first = Jalaali.convert(DateTime(2024, 3, 20));
    final last = Jalaali.convert(DateTime(2025, 3, 19));
    expect(first, (year: 1403, month: 1, day: 1));
    expect(last.year, 1403);
    expect(last.month, 12);
    expect(last.day, 29); // سال عادی
  });

  test('سال leap جلالی', () {
    // سال ۱۳۹۹ (2020-03-20 .. 2021-03-20) 366 روز است.
    final a = Jalaali.convert(DateTime(2020, 3, 20));
    final b = Jalaali.convert(DateTime(2021, 3, 20));
    expect(a, (year: 1399, month: 1, day: 1));
    expect(b.year, 1400);
  });

  test('ماه‌های فارسی', () {
    expect(PersianMonths.name(1), 'فروردین');
    expect(PersianMonths.name(12), 'اسفند');
  });

  test('روزِ هفته', () {
    expect(Jalaali.weekdayName(DateTime(2024, 3, 20)), 'سه‌شنبه');
  });
}
