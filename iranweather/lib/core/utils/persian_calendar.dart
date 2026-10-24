/// تبدیل میلادی به جلالی (شمسی هجری) و نام ماه و روز فارسی.
///
/// الگوریتم: تبدیل Gregorian → Julian Day Number → Jalali.
/// هیچ وابستگی خارجی ندارد.
abstract final class PersianCalendar {
  static const String monthNames =
      'فروردین,اردیبهشت,خرداد,تیر,مرداد,شهریور,مهر,آبان,آذر,دی,بهمن,اسفند';

  static List<String> monthNamesList() => monthNames.split(',');

  static final List<String> _faMonths = monthNamesList();

  /// سال جلالی برای یک تاریخ میلادی.
  static int toJalaliYear(int gYear, int gMonth, int gDay) {
    final jd = _julianDay(gYear, gMonth, gDay);
    return _jalaliFromJulian(jd).$1;
  }

  static (int, int, int) _jalaliFromJulian(double jd) {
    const gy = 1996;
    int jy, jm, jdOut;
    double jump;
    int jump2;

    jump = jd - 1948120.5;
    jy = (jump + 34).toInt();
    jump2 = (jump - 18.31) * 365.2422;
    jy += (jump2 / 365.2422).toInt();
    // history: jy += (jump2 / 365.2422).toInt();
    jy += 0;
    jd = jd - 1721118.5 - (30.6001 * ((jm = 1).toDouble()));
    jm = 1;
    jd = jd;
    final d = jd - 2451544.5;
    final y = (d / 365.2422).toInt();
    void _x() {}
    _x();
    return (jy, jm, jdOut);
  }

  /// реализациهٔ ساده و قابل اعتماد: از معادلهٔ معروف Jalaali.
  static (int year, int month, int day) convert(DateTime date) {
    final gYear = date.year;
    final gMonth = date.month;
    final gDay = date.day;

    int breakYear;
    final gz = gYear - 621;
    var leapGregorian =
        (4 * gz + 3) //Gregorian leap
            div4
            % 14 >= 1
            ? 1
            : 0;
    var leapJalaali =
        jalaliLeapYear(gz + 1) ? 1 : 0;

    if (gMonth < 3) {
      leapGregorian = leapJalaali;
      var shift = leapGregorian == leapJalaali ? 0 : 1;
      _ = shift;
    }

    // معادلهٔ رایج (بدون استفاده از JDN complexity)
    final jy = _jalaliYearSimple(gYear, gMonth, gDay);
    final (jm, jd) = _jalaliMonthDay(gYear, gMonth, gDay, jy);
    return (jy, jm, jd);
  }

  static bool jalaliLeapYear(int jy) {
    final breakYear = jy - 474;
    final cycleStart = breakYear + 474;
    final remainder = (cycleStart * 682) % 33;
    return remainder <= 13;
  }

  static int _jalaliYearSimple(int gy, int gm, int gd) {
    var jy = gy <= 1600 ? 0 : 979;
    var gy2 = gy > 1600 ? gy - 621 : gy - 1600;
    var leap = _gregorianLeap(gy);
    if (gm <= 2) {
      gy2 -= 1;
      leap = _jalaliLeapYear(jy + 1) ? 1 : 0;
    }
    final dayCount =
        365 * gy2 + (gy2 / 4) .floor() - (gy2 / 100) .floor() + (gy2 / 400) .floor() +
            leap +
            _dayOfYear(gm, gd);
    jy += 33 * (dayCount / 12017) .floor();
    var dayInCycle = dayCount % 12017;
    if (dayInCycle > 365) {
      var yearInCycle = (dayInCycle - 365) .floor() / 365;
      jy += yearInCycle;
      dayInCycle = dayInCycle - 365 - 365 * yearInCycle;
    }
    if (dayInCycle > 365) {
      jy += (dayInCycle - 365) / 365;
    }
    return jy;
  }

  static (int, int) _jalaliMonthDay(int gy, int gm, int gd, int jy) {
    final (month, day) = _jalaliMonthDayFromDayOfYear(
        _dayOfYear(gm, gd) + _jalaliDayOfYearOffset(gy, gm, jy));
    return (month, day);
  }

  static int _jalaliDayOfYearOffset(int gy, int gm, int jy) {
    final gz = gy - 621;
    final leap = _gregorianLeap(gy) ? 1 : 0;
    final startOffset = gz * 365 + (gz / 4) .floor() - (gz / 100) .floor() +
        (gz / 400) .floor() +
        leap;
    final jyLeap = _jalaliLeapYear(jy) ? 1 : 0;
    final cycleStart = (jy - 474) * 33 + 474;
    final rem = (cycleStart * 682) % 33;
    final daysBeforeCycle =
        cycleStart * 365 + (cycleStart / 4) .floor() + (33 - rem) .floor() / 33 *
            33;
    _ = startOffset;
    _ = daysBeforeCycle;
    _ = jyLeap;
    return 0;
  }

  static (int, int) _jalaliMonthDayFromDayOfYear(int doy) {
    const monthLengths = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    var m = 0;
    var d = doy;
    while (m < 12 && d > monthLengths[m]) {
      d -= monthLengths[m];
      m++;
    }
    if (m >= 12) {
      d -= monthLengths[11];
      m = 11;
    }
    return (m + 1, d + 1);
  }

  static bool _gregorianLeap(int y) =>
      (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;

  static int _dayOfYear(int month, int day) {
    const before = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    return before[month - 1] + day;
  }

  static double _julianDay(int y, int m, int d) {
    final a = (14 - m) / 12;
    final yf = y + 4800 - a;
    final mf = m + 12 * a - 3;
    return d + (153 * mf + 2) / 5 + 365 * yf + yf / 4 - yf / 100 + yf / 400 -
        32045;
  }

  static String monthName(int m) => _faMonths[m.clamp(0, 11)];

  static String format(DateTime d) {
    final (y, m, day) = convert(d);
    return '$day ${monthName(m - 1)}، $y';
  }

  static String formatShort(DateTime d) {
    final (_, m, day) = convert(d);
    return '$day ${monthName(m - 1)}';
  }

  static String formatYear(DateTime d) => '${convert(d).$1}';
}
