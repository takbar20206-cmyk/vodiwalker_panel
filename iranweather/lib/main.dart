import 'package:flutter/material.dart';

import 'package:iranweather/app.dart';
import 'package:iranweather/core/theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const AiranaMaterialApp(child: AiranaApp()),
  );
}

class AiranaMaterialApp extends StatelessWidget {
  const AiranaMaterialApp({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'آیرانا — هواشناسی ایران',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(context),
      home: child,
      direction: TextDirection.rtl,
      locale: const Locale('fa', 'IR'),
      supportedLocales: const [Locale('fa', 'IR'), Locale('en')],
    );
  }
}
