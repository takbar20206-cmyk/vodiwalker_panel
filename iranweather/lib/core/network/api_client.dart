import 'dart:convert';

import 'package:http/http.dart' as http;

/// Client ساده و robust برای هر APIی بدون key (Open-Meteo, USGS, EMSC).
///
/// همه‌ی endpointهای این اپلیکیشن **آزاد و key‌بنشدنی** هستند:
/// نیازی به ثبت هیچ کلید API نیست.
abstract final class ApiClient {
  static const String openMeteo = 'https://api.open-meteo.com';
  static const String openMeteoAir = 'https://air-quality-api.open-meteo.com';
  static const String geocoding = 'https://geocoding-api.open-meteo.com';
  static const String usgs = 'https://earthquake.usgs.gov';
  static const String emsc = 'https://www.seismicportal.eu';

  /// timezone پیش‌فرض: تهران.
  static const String timezone = 'Asia/Tehran';

  static Map<String, String> _headers() => const {
        'User-Agent':
            'AiranaWeather/1.0 (Iran) - Flutter - open source; contact: dev@example.com',
        'Accept': 'application/json',
      };

  static Future<Map<String, dynamic>> getJson(
    String url, {
    Map<String, String>? query,
    Duration timeout = const Duration(seconds: 20),
    int retries = 2,
  }) async {
    Uri uri = Uri.parse(url);
    if (query != null && query.isNotEmpty) {
      uri = uri.replace(query: query);
    }

    Exception? last;
    for (var attempt = 0; attempt <= retries; attempt++) {
      try {
        final response = await http
            .get(uri, headers: _headers())
            .timeout(timeout);
        if (response.statusCode == 200) {
          final body = utf8.decode(response.bodyBytes, allowMalformed: true);
          return Map<String, dynamic>.from(jsonDecode(body));
        }
        if (response.statusCode == 429 && attempt < retries) {
          await Future.delayed(const Duration(milliseconds: 900));
          continue;
        }
        throw ApiException('خطای $response');
      } on SocketException catch (e) {
        last = e;
        if (attempt < retries) {
          await Future.delayed(
              Duration(milliseconds: 400 * (attempt + 1)));
        }
      } on TimeoutException catch (e) {
        last = e;
      } catch (e) {
        last = e is Exception ? e : Exception(e.toString());
      }
    }
    throw ApiException('امکان اتصال وجود ندارد (حاول again). ${last ?? ''}');
  }

  static Future<String> getText(String url,
      {Map<String, String>? query}) async {
    Uri uri = Uri.parse(url);
    if (query != null) uri = uri.replace(query: query);
    final response = await http
        .get(uri, headers: _headers())
        .timeout(const Duration(seconds: 25));
    if (response.statusCode != 200) {
      throw ApiException('خطای $response');
    }
    return utf8.decode(response.bodyBytes, allowMalformed: true);
  }
}

class ApiException implements Exception {
  final String message;
  ApiException(this.message);

  @override
  String toString() => message;
}
