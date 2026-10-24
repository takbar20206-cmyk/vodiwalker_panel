/// اعداد فارسی ۰۰۱۲۳۴۵۶۷۸۹.
const String _faDigits = '۰۱۲۳۴۵۶۷۸۹';
const String _enDigits = '0123456789';

/// تبدیل هر عدد به شکل فارسی، بدون تغییر دادن متن.
String toPersianDigits(String input) {
  if (input.isEmpty) return input;
  final sb = StringBuffer(input.length);
  for (final ch in input.characters) {
    final idx = _enDigits.indexOf(ch);
    sb.write(idx >= 0 ? _faDigits[idx] : ch);
  }
  return sb.toString();
}

/// تبدیل اعداد فارسی به انگلیسی (برای محاسبه).
String toEnglishDigits(String input) {
  if (input.isEmpty) return input;
  final sb = StringBuffer(input.length);
  for (final ch in input.characters) {
    final idx = _faDigits.indexOf(ch);
    sb.write(idx >= 0 ? _enDigits[idx] : ch);
  }
  return sb.toString();
}

String toFa(double value, {int decimals = 0}) {
  String s = value.toStringAsFixed(decimals);
  return toPersianDigits(s);
}
