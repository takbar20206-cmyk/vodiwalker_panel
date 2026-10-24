import 'package:flutter/material.dart';

import 'package:iranweather/core/constants/weather_codes.dart';

/// تم کلی app: glassmorphism + typography فارسی Vazirmatn.
abstract final class AppTheme {
  static ThemeData light(BuildContext context) {
    final scheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFF1E5AA8),
      brightness: Brightness.light,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: const Color(0xFF05070F),
      fontFamily: 'Vazirmatn',
      textTheme: _textTheme,
      appBarTheme: AppBarTheme(
        centerTitle: false,
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor: Colors.white,
        titleTextStyle: const TextStyle(
            fontFamily: 'Vazirmatn',
            fontSize: 18,
            fontWeight: FontWeight.w700),
      ),
      cardTheme: CardThemeData(
        color: const Color(0x14FFFFFF),
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(22)),
      ),
      dividerTheme: const DividerThemeData(
          color: Color(0x22FFFFFF), thickness: 1, space: 1),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: const Color(0xFFFFFFFF),
          foregroundColor: const Color(0xFF0B1836),
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.white,
          side: const BorderSide(color: Color(0x33FFFFFF)),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16)),
        ),
      ),
    );
  }

  static const TextTheme _textTheme = TextTheme(
    displayLarge: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.w300, color: Colors.white, height: 1.05),
    displayMedium: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.w300, color: Colors.white),
    displaySmall: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.w400, color: Colors.white),
    headlineLarge: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.w700, color: Colors.white, fontSize: 26),
    headlineMedium: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.w700, color: Colors.white, fontSize: 20),
    headlineSmall: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.w600, color: Colors.white, fontSize: 17),
    titleLarge: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.w700, color: Colors.white, fontSize: 18),
    titleMedium: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.w600, color: Colors.white, fontSize: 16),
    titleSmall: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.w600, color: Color(0xFFB9C8E8), fontSize: 13),
    bodyLarge: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.w400, color: Colors.white, fontSize: 16, height: 1.6),
    bodyMedium: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.w400, color: Color(0xFFDCE6F7), fontSize: 14, height: 1.6),
    bodySmall: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.w400, color: Color(0xFF9FB2D8), fontSize: 12, height: 1.5),
    labelLarge: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.w500, color: Color(0xFFDCE6F7), fontSize: 14),
    labelMedium: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.w500, color: Color(0xFFB9C8E8), fontSize: 12),
  );

  /// گردشِ رنگ برای state.
}

/// غلظت‌های رنگ برای کارت‌های glass.
abstract final class Glass {
  static Color tint(BuildContext context, {double opacity = 0.14}) {
    return Colors.white.withValues(alpha: opacity);
  }

  static BorderRadius radius(double value) => BorderRadius.circular(value);
}

/// رنگ‌بندیِ هشدار برای کارت‌ها.
abstract final class DangerColors {
  static Color forScore(int score) => switch (score) {
        0 => const Color(0xFF5BE38B),
        1 => const Color(0xFFFFE066),
        2 => const Color(0xFFFFB020),
        3 => const Color(0xFFFF7A2E),
        4 => const Color(0xFFFF4D4D),
        _ => const Color(0xFFC0392B),
      };
}

/// به‌دستِ آمدن Color از SkyPalette.
Color paletteColor(SkyPalette p) => p.mid;
