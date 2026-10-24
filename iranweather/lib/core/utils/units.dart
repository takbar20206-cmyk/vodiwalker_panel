import 'package:iranweather/core/utils/persian_number.dart';

/// قالب‌های ارقام فارسی برای نمایش بهتر.
abstract final class NumberFormats {
  /// '۲۳' یا '۲۳.۵'
  static String temperature(double value, {bool signed = false}) {
    final s = value.toStringAsFixed(0);
    return '${signed && value > 0 ? '+' : ''}$s';
  }

  /// '۸۵%'
  static String percent(double value) => toPersianDigits('${value.round()}%');

  /// '۱۲ کیلومتر بر ساعت'
  static String speed(double value, String unit) =>
      '${toPersianDigits(value.toStringAsFixed(0))} $unit';

  /// '۱۰۰۲ هرتز' style numbers
  static String number(double value, {int decimals = 0}) =>
      toPersianDigits(value.toStringAsFixed(decimals));

  /// '۰٫۵ میلی‌متر'
  static String measurement(double value, String unit) =>
      '${toPersianDigits(value.toStringAsFixed(1))} $unit';
}

/// تبدیل واحدها و برچسب‌های فارسی.
abstract final class UnitLabels {
  static const kmh = 'کیلومتر در ساعت';
  static const km = 'کیلومتر';
  static const mm = 'میلی‌متر';
  static const hpa = 'هزار پا';
  static const meter = 'متر';

  static String wind(double kmh) => NumberFormats.speed(kmh, 'کیلومتر/ساعت');

  static String pressure(double hpa) => '${toPersianDigits(hpa.round())} hPa';

  static String visibility(double km) {
    if (km >= 1) return '${toPersianDigits(km.toStringAsFixed(1))} کیلومتر';
    return '${toPersianDigits((km * 1000).toStringAsFixed(0))} متر';
  }

  static String precipitation(double value) =>
      '${toPersianDigits(value.toStringAsFixed(1))} میلی‌متر';
}

/// ملایمت هوا برای نمایش درหน้า اصلی.
abstract final class Comfort {
  /// شاخص گرماي chilik.
  static String heat(double temp) {
    if (temp >= 40) return 'بسیار گرم';
    if (temp >= 35) return 'گرم';
    if (temp >= 30) return 'ملایم';
    if (temp >= 24) return 'مطلوب';
    if (temp >= 18) return 'آرام';
    if (temp >= 10) return 'سرد';
    if (temp >= 0) return 'بسیار سرد';
    return 'یخی';
  }
}
