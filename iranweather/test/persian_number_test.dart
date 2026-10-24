import 'package:flutter_test/flutter_test.dart';

import 'package:iranweather/core/utils/persian_number.dart';

void main() {
  test('تبدیل اعداد به فارسی', () {
    expect(toPersianDigits('2024'), '۲۰۲۴');
    expect(toPersianDigits('۲۵.۵'), '۲۵.۵');
    expect(toPersianDigits('abc'), 'abc');
  });

  test('تبدیل فارسی به انگلیسی', () {
    expect(toEnglishDigits('۲۵'), '25');
  });

  test('toFa روی double', () {
    expect(toFa(25.0), '۲۵');
    expect(toFa(25.5, decimals: 1), '۲۵.۵');
  });

  test('مقادیر خالی', () {
    expect(toPersianDigits(''), '');
  });
}
