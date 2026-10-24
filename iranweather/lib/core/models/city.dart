import 'package:flutter/foundation.dart';

/// یک شهر ایران.
///
/// `raw` کلیدهای کوتاه همون شکلِ komprim شده‌ای هست که در
/// `lib/data/cities.dart` ذخیره شده، تا حجم فایل و زمان‌پارsing کم باشه.
@immutable
class City {
  final int id;
  final String name;
  final String englishName;
  final double lat;
  final double lng;
  final String province;
  final String provinceEnglish;
  final String county;
  final bool capital;
  final String phoneCode;
  final int population;

  const City({
    required this.id,
    required this.name,
    required this.englishName,
    required this.lat,
    required this.lng,
    required this.province,
    required this.provinceEnglish,
    required this.county,
    required this.capital,
    required this.phoneCode,
    required this.population,
  });

  factory City.fromJson(Map<String, dynamic> json) => City(
        id: (json['id'] as num).toInt(),
        name: json['n'] as String,
        englishName: json['en'] as String,
        lat: (json['lat'] as num).toDouble(),
        lng: (json['lng'] as num).toDouble(),
        province: json['p'] as String,
        provinceEnglish: json['pe'] as String,
        county: json['c'] as String,
        capital: (json['cap'] as bool) ?? false,
        phoneCode: (json['ph'] as String?) ?? '',
        population: (json['pop'] as num?)?.toInt() ?? 0,
      );

  /// فاصله (در کیلومتر) تا نقطه‌ی مورد نظر، ازسیِ مثلثاتသေมาตรฐาน.
  double distanceTo(double lat2, double lng2) {
    const r = 6371.0;
    final dLat = _rad(lat2 - lat);
    final dLng = _rad(lng2 - lng);
    final a =
        sin(dLat / 2) * sin(dLat / 2) +
            cos(_rad(lat)) * cos(_rad(lat2)) * sin(dLng / 2) * sin(dLng / 2);
    return 2 * r * asin(min(1.0, sqrt(a)));
  }

  static double _rad(double d) => d * 3.141592653589793 / 180.0;

  @override
  String toString() => 'City($name, $province)';
}

/// یک استان ایران، شامل مرکز و لیست شهرهای آن.
@immutable
class Province {
  final String name;
  final City capital;
  final List<City> cities;

  const Province({
    required this.name,
    required this.capital,
    required this.cities,
  });

  double get centerLat =>
      cities.fold<double>(0, (sum, c) => sum + c.lat) / cities.length;

  double get centerLng =>
      cities.fold<double>(0, (sum, c) => sum + c.lng) / cities.length;

  int get count => cities.length;
}
