import 'package:flutter/foundation.dart';

/// Central place for API configuration.
///
/// The base URL is NEVER hardcoded here. It's injected at build/run time via
/// --dart-define, so production URLs never end up committed to source control:
///
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.10:3000/api
///   flutter build apk --dart-define=API_BASE_URL=https://api.virtualshop.co.mz/api
///
/// Em builds debug/profile, se não for passado, usa o default local de
/// desenvolvimento. Em builds release é obrigatório e tem de usar HTTPS.
class ApiConstants {
  ApiConstants._();

  static const String _envBaseUrl = String.fromEnvironment('API_BASE_URL');

  /// --dart-define tem sempre prioridade. Sem ele, escolhe o default de
  /// desenvolvimento certo para a plataforma:
  ///  - Android emulator -> 10.0.2.2 (é o "localhost" da máquina host)
  ///  - iOS simulator e desktop -> localhost
  static String get baseUrl {
    final configured = _envBaseUrl.trim();
    if (configured.isNotEmpty) {
      final uri = Uri.tryParse(configured);
      if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
        throw StateError('API_BASE_URL inválida: $configured');
      }
      if (kReleaseMode && uri.scheme != 'https') {
        throw StateError(
          'API_BASE_URL tem de usar HTTPS em builds release: $configured',
        );
      }
      return configured;
    }
    if (kReleaseMode) {
      throw StateError(
        'API_BASE_URL é obrigatória em builds release. Usa '
        '--dart-define=API_BASE_URL=https://api.exemplo.com/api',
      );
    }
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000/api';
    }
    return 'http://localhost:3000/api';
  }

  /// Falha cedo (no arranque) se a configuração de release estiver em falta.
  static void validateConfiguration() {
    final uri = Uri.tryParse(baseUrl);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      throw StateError('API_BASE_URL inválida.');
    }
  }

  /// Resolve image paths stored relative to the API, while preserving full
  /// remote URLs for existing catalog records during migration.
  static String resolveImageUrl(String path) {
    final uri = Uri.tryParse(path);
    if (uri != null && uri.hasScheme) return path;
    return Uri.parse(baseUrl).resolve(path).toString();
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

  // Cart and orders
  static const String cart = '/cart';
  static const String cartItems = '/cart/items';
  static const String orders = '/orders';
  static const String favorites = '/favorites';
  static const String notifications = '/notifications';
  static const String notificationUnreadCount = '/notifications/unread-count';
  static String notificationRead(Object id) => '$notifications/$id/read';
  static const String notificationsReadAll = '/notifications/read-all';

  // User profile and addresses
  static const String userProfile = '/users/me';
  static const String userProfilePhoto = '/users/me/photo';
  static const String userPassword = '/users/me/password';
  static const String userStats = '/users/me/stats';
  static const String userAddresses = '/users/me/addresses';

  static String favorite(int productId) => '$favorites/$productId';
  static String userAddress(Object id) => '$userAddresses/$id';
  static String userAddressDefault(Object id) => '${userAddress(id)}/default';

  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 10);
}
