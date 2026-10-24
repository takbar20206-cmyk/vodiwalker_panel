/// تبدیل تاریخ میلادی (Gregorian) به جلالی (شمسی هجری) و برعکس.
///
/// این class‌ها ریشه درImplementationِ test‌شده‌ی کتابخانهٔ
/// `shamsi_date` (Amirreza Madani، BSD) دارد و تنها بخشِ محاسبه‌ی
/// Mathematikaِ آن‌را بدون وابستگی‌ی external منتقل کرده.
///
/// المان‌ها:
///  * `toJulianDayNumber` / `fromJulianDayNumber` — Meeus, *Astronomical Algorithms*
///  * `_jalCal` — Borkowski, *The Persian Calendar* (see
///    http://www.astro.uni.torun.pl/~kb/Papers/EMP/PersianC-EMP.htm)
library;

/// سال، ماه و روز جلالی (ماه‌ها 1..12، روزها 1..31).
typedef JalaaliDate = ({int year, int month, int day});

abstract final class Jalaali {
  /// نقاطِ قطعِ ۳۳‌ساله‌ی سال‌های جلالی.
  static const List<int> breaks = [
    -61,
    9,
    38,
    199,
    426,
    686,
    756,
    818,
    1111,
    1181,
    1210,
    1635,
    2060,
    2097,
    2192,
    2262,
    2324,
    2394,
    2456,
    3178,
  ];

  static ({int leap, int gy, int march}) _jalCal(int jy) {
    final bl = breaks.length;
    final gy = jy + 621;
    int leapJ = -14;
    int jp = breaks[0];
    int jump = 0;

    for (int i = 1; i < bl; i++) {
      final jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + (jump ~/ 33) * 8 + ((jump % 33) ~/ 4);
      jp = jm;
    }
    int n = jy - jp;

    leapJ = leapJ + (n ~/ 33) * 8 + (((n % 33) + 3) ~/ 4);
    if ((jump % 33) == 4 && jump - n == 4) leapJ += 1;

    final leapG = (gy ~/ 4) - ((((gy ~/ 100) + 1) * 3) ~/ 4) - 150;
    final march = 20 + leapJ - leapG;

    if (jump - n < 6) {
      n = n - jump + ((jump + 4) ~/ 33) * 33;
    }
    var leap = (((n + 1) % 33) - 1) % 4;
    if (leap == -1) leap = 4;

    return (leap: leap, gy: gy, march: march);
  }

  /// تاریخ میلادی → شماره‌ی деньِ Julian.
  static int toJulianDayNumber(DateTime d) {
    final y = d.year;
    final m = d.month;
    final day = d.day;
    final a = (14 - m) ~/ 12;
    final yy = y + 4800 - a;
    final mm = m + 12 * a - 3;
    return day + (153 * mm + 2) ~/ 5 + 365 * yy + yy ~/ 4 - yy ~/ 100 +
        yy ~/ 400 - 32045;
  }

  /// شماره‌ی деньِ Julian → سال، ماه و روز میلادی.
  static (int, int, int) fromJulianDayNumber(int jdn) {
    var a = jdn + 32044;
    final b = (4 * a + 3) ~/ 146097;
    final c = a - (146097 * b) ~/ 4;
    final d = (4 * c + 3) ~/ 1461;
    final e = c - (1461 * d) ~/ 4;
    final m = (5 * e + 2) ~/ 153;
    final day = e - (153 * m + 2) ~/ 5 + 1;
    final month = m + 3 - 12 * (m ~/ 10);
    final year = 100 * b + d - 4800 + m ~/ 10;
    return (year, month, day);
  }

  /// سال، ماه و روز جلالی برای یک تاریخ میلادی.
  static JalaaliDate convert(DateTime date) {
    final jdn = toJulianDayNumber(date);
    final (gy, _, _) = fromJulianDayNumber(jdn);
    var jy = gy - 621;
    final r = _jalCal(jy);

    final marchDate = DateTime(gy, 3, r.march);
    final jdn1f = toJulianDayNumber(marchDate);
    var k = jdn - jdn1f;

    if (k >= 0) {
      if (k <= 185) {
        return (year: jy, month: 1 + k ~/ 31, day: (k % 31) + 1);
      }
      k -= 186;
    } else {
      jy -= 1;
      k += 179;
      if (r.leap == 1) k += 1;
    }
    return (year: jy, month: 7 + k ~/ 30, day: (k % 30) + 1);
  }

  /// سال جلالی.
  static int yearOf(DateTime d) => convert(d).year;

  /// ماه و روز جلالی به صورت '۸ آذر ۱۴۰۵'.
  static String format(DateTime d) {
    final j = convert(d);
    return '${j.day} ${PersianMonths.name(j.month)}، ${j.year}';
  }

  /// همان حالت کوتاه: '۸ آذر'.
  static String formatShort(DateTime d) {
    final j = convert(d);
    return '${j.day} ${PersianMonths.name(j.month)}';
  }

  /// روزِ هفته با عنوان فارسی.
  static String weekdayName(DateTime d) {
    const names = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
    return names[d.weekday % 7];
  }
}

/// نام‌های فارسی ماه‌های شمسی.
abstract final class PersianMonths {
  static const List<String> names = [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند',
  ];

  static String name(int month) => names[month.clamp(1, 12) - 1];
}
