import 'package:flutter/foundation.dart';

import 'package:iranweather/core/models/city.dart';

/// وضعیتِ app به‌صورتِ ChangeNotifier — شهرِ انتخاب‌شده، واحدها، هشدارها.
class AppState extends ChangeNotifier {
  City _city;
  bool _metricUnits = true; // true = metric (C, km/h)
  bool _persianNumbers = true;
  bool _lightningFeedEnabled = false;
  String _lightningFeedUrl = '';
  bool _earthquakeAlerts = true;

  AppState({required City city}) : _city = city;

  City get city => _city;
  set city(City value) {
    if (_city == value) return;
    _city = value;
    notifyListeners();
  }

  bool get metricUnits => _metricUnits;
  set metricUnits(bool v) {
    _metricUnits = v;
    notifyListeners();
  }

  bool get persianNumbers => _persianNumbers;
  set persianNumbers(bool v) {
    _persianNumbers = v;
    notifyListeners();
  }

  bool get lightningFeedEnabled => _lightningFeedEnabled;
  set lightningFeedEnabled(bool v) {
    _lightningFeedEnabled = v;
    notifyListeners();
  }

  String get lightningFeedUrl => _lightningFeedUrl;
  set lightningFeedUrl(String v) {
    _lightningFeedUrl = v;
    notifyListeners();
  }

  bool get earthquakeAlerts => _earthquakeAlerts;
  set earthquakeAlerts(bool v) {
    _earthquakeAlerts = v;
    notifyListeners();
  }
}
