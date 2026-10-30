import 'package:dio/dio.dart';

import '../constants/api_constants.dart';

class AdminTokens {
  const AdminTokens({required this.accessToken, required this.refreshToken});

  final String accessToken;
  final String refreshToken;
}

class AdminSession {
  AdminSession({Dio? dio, this.onExpired})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: ApiConstants.baseUrl,
              connectTimeout: const Duration(seconds: 10),
              receiveTimeout: const Duration(seconds: 15),
              headers: const {'Content-Type': 'application/json'},
            ),
          );

  final Dio _dio;
  final void Function()? onExpired;

  String? _accessToken;
  String? _refreshToken;
  int _generation = 0;
  bool _expiredNotified = false;
  Future<bool>? _refreshFuture;

  String? get accessToken => _accessToken;

  bool get isAuthenticated => _accessToken != null;

  void start(AdminTokens tokens) {
    _generation++;
    _accessToken = tokens.accessToken;
    _refreshToken = tokens.refreshToken;
    _expiredNotified = false;
    _refreshFuture = null;
  }

  Future<bool> refresh() {
    final ongoing = _refreshFuture;
    if (ongoing != null) return ongoing;

    final future = _performRefresh();
    _refreshFuture = future;
    return future.whenComplete(() {
      if (identical(_refreshFuture, future)) _refreshFuture = null;
    });
  }

  Future<bool> _performRefresh() async {
    final refreshToken = _refreshToken;
    final generation = _generation;
    if (refreshToken == null || refreshToken.isEmpty) {
      _expire(generation);
      return false;
    }

    try {
      final response = await _dio.post<dynamic>(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final body = response.data;
      final data = body is Map ? body['data'] : null;
      if (data is! Map) {
        throw const FormatException('Resposta de renovação inválida.');
      }

      final accessToken = data['token']?.toString();
      final nextRefreshToken = data['refreshToken']?.toString();
      if (accessToken == null ||
          accessToken.isEmpty ||
          nextRefreshToken == null ||
          nextRefreshToken.isEmpty) {
        throw const FormatException('Tokens de renovação inválidos.');
      }
      if (generation != _generation) return false;

      _accessToken = accessToken;
      _refreshToken = nextRefreshToken;
      _expiredNotified = false;
      return true;
    } catch (_) {
      _expire(generation);
      return false;
    }
  }

  Future<void> logout() async {
    final refreshToken = _refreshToken;
    _generation++;
    _accessToken = null;
    _refreshToken = null;
    _expiredNotified = false;
    _refreshFuture = null;

    if (refreshToken == null || refreshToken.isEmpty) return;

    try {
      await _dio.post<dynamic>(
        '/auth/logout',
        data: {'refreshToken': refreshToken},
      );
    } catch (_) {}
  }

  void _expire(int generation) {
    if (generation != _generation) return;

    _generation++;
    _accessToken = null;
    _refreshToken = null;
    _refreshFuture = null;
    if (_expiredNotified) return;

    _expiredNotified = true;
    onExpired?.call();
  }
}
