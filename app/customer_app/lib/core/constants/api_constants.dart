import 'package:flutter/foundation.dart';

/// Central place for API configuration.
///
/// The base URL is NEVER hardcoded here. It's injected at build/run time via
/// --dart-define, so production URLs never end up committed to source control:
///
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.10:3000/api
///   flutter build apk --dart-define=API_BASE_URL=https://api.virtualshop.co.mz/api
///
/// If you forget to pass it, this falls back to the local dev default so the
/// app is still runnable out of the box — but that fallback must never be a
/// production URL.
class ApiConstants {
  ApiConstants._();

  static const String _envBaseUrl = String.fromEnvironment('API_BASE_URL');

  /// --dart-define tem sempre prioridade. Sem ele, escolhe o default de
  /// desenvolvimento certo para a plataforma:
  ///  - Android emulator -> 10.0.2.2 (é o "localhost" da máquina host)
  ///  - Web (Chrome), Linux, etc. -> localhost
  static String get baseUrl {
    if (_envBaseUrl.isNotEmpty) return _envBaseUrl;
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000/api';
    }
    return 'http://localhost:3000/api';
  }

  // Auth
  static const String register = '/auth/register';
  static const String login = '/auth/login';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';

  // Catalog
  static const String categories = '/categories';
  static const String products = '/products';
  static const String popularProducts = '/products/popular';
  static const String newArrivals = '/products/new-arrivals';

  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 10);
}
