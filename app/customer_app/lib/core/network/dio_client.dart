import 'package:dio/dio.dart';

import '../constants/api_constants.dart';
import '../storage/secure_storage_service.dart';

/// Called when the refresh token itself is rejected (expired/revoked) —
/// the app has no way to recover except sending the user back to login.
typedef OnSessionExpired = void Function(int sessionGeneration);

/// Builds a single shared Dio instance for the whole app.
///
/// Behaviour:
/// 1. Every request gets `Authorization: Bearer <access_token>` attached.
/// 2. On a 401, it pauses, calls POST /auth/refresh once, stores the new
///    token pair, then retries the original request transparently.
/// 3. If several requests 401 at the same time, only ONE refresh call is
///    made — the rest wait on it and reuse its result (avoids a refresh
///    storm and avoids the refresh token being rotated twice).
/// 4. If the server REJECTS the refresh token, tokens are cleared and
///    [onSessionExpired] is called so the UI can route to /login.
///    (Uma falha de rede durante o refresh NÃO termina a sessão.)
/// 5. login/register/logout nunca disparam refresh: um 401 em /auth/login
///    significa "credenciais inválidas", não "token expirado".
/// 6. Every request is tied to the session generation that created it.
///    Results and refreshes from an older generation are discarded and can
///    never overwrite the tokens of a newer session.
class DioClient {
  DioClient({
    required SecureStorageService storage,
    required OnSessionExpired onSessionExpired,
    required int Function() sessionGeneration,
    Dio? customDio,
    Dio? customRefreshDio,
  }) : _storage = storage,
       _onSessionExpired = onSessionExpired,
       _sessionGeneration = sessionGeneration {
    dio = customDio ?? Dio(_baseOptions);
    // Separate, interceptor-free client just for the refresh call itself —
    // otherwise a 401 on /auth/refresh would try to refresh itself.
    _refreshDio = customRefreshDio ?? Dio(_baseOptions);

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          options.extra[_sessionGenerationKey] = _sessionGeneration();
          if (!_isAuthEndpoint(options.path)) {
            final token = await _storage.getAccessToken();
            if (token != null && token.isNotEmpty) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final isUnauthorized = error.response?.statusCode == 401;
          final alreadyRetried =
              error.requestOptions.extra[_retriedKey] == true;
          // Um pedido só é repetido UMA vez — evita ciclos infinitos se o
          // servidor continuar a responder 401 mesmo com o token novo.
          if (!isUnauthorized ||
              alreadyRetried ||
              _isAuthEndpoint(error.requestOptions.path)) {
            return handler.next(error);
          }

          final requestGeneration =
              error.requestOptions.extra[_sessionGenerationKey];
          final generation = requestGeneration is int
              ? requestGeneration
              : _sessionGeneration();
          if (!_isCurrent(generation)) {
            return handler.next(error);
          }

          final result = await _refreshAccessToken(generation);
          if (!_isCurrent(generation)) {
            return handler.next(error);
          }

          switch (result.status) {
            case _RefreshStatus.success:
              final newAccessToken = result.accessToken;
              if (newAccessToken == null) {
                await _handleSessionExpired(generation);
                return handler.next(error);
              }

              // Retry the original request with the fresh token.
              final retryOptions = error.requestOptions;
              retryOptions.extra[_retriedKey] = true;
              retryOptions.extra[_sessionGenerationKey] = generation;
              retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';
              try {
                final response = await dio.fetch(retryOptions);
                if (!_isCurrent(generation)) {
                  return handler.next(error);
                }
                return handler.resolve(response);
              } on DioException catch (e) {
                return handler.next(e);
              } catch (_) {
                return handler.next(error);
              }
            case _RefreshStatus.rejected:
              // O servidor recusou o refresh token -> sessão acabou.
              await _handleSessionExpired(generation);
              return handler.next(error);
            case _RefreshStatus.stale:
              return handler.next(error);
            case _RefreshStatus.failure:
              final failure = result.error;
              if (failure is DioException) return handler.next(failure);
              return handler.next(error);
          }
        },
      ),
    );
  }

  static BaseOptions get _baseOptions => BaseOptions(
    baseUrl: ApiConstants.baseUrl,
    connectTimeout: ApiConstants.connectTimeout,
    receiveTimeout: ApiConstants.receiveTimeout,
    headers: {'Content-Type': 'application/json'},
  );

  static const _retriedKey = 'retried_after_refresh';
  static const _sessionGenerationKey = 'session_generation';

  late final Dio dio;
  late final Dio _refreshDio;
  final SecureStorageService _storage;
  final OnSessionExpired _onSessionExpired;
  final int Function() _sessionGeneration;

  // Ensures concurrent 401s from the same session share a single in-flight
  // refresh call. A refresh started by an older session is never reused by a
  // newer one.
  Future<_RefreshResult>? _refreshInProgress;
  int? _refreshGeneration;

  bool _isAuthEndpoint(String path) =>
      path.contains(ApiConstants.login) ||
      path.contains(ApiConstants.register) ||
      path.contains(ApiConstants.refresh) ||
      path.contains(ApiConstants.logout);

  bool _isCurrent(int generation) => _sessionGeneration() == generation;

  Future<_RefreshResult> _refreshAccessToken(int generation) {
    final existing = _refreshInProgress;
    if (existing != null && _refreshGeneration == generation) {
      return existing;
    }

    final future = _doRefresh(generation);
    _refreshInProgress = future;
    _refreshGeneration = generation;
    future.whenComplete(() {
      if (identical(_refreshInProgress, future)) {
        _refreshInProgress = null;
        _refreshGeneration = null;
      }
    });
    return future;
  }

  Future<_RefreshResult> _doRefresh(int generation) async {
    if (!_isCurrent(generation)) return const _RefreshResult.stale();

    try {
      final refreshToken = await _storage.getRefreshToken();
      if (!_isCurrent(generation)) return const _RefreshResult.stale();
      if (refreshToken == null || refreshToken.isEmpty) {
        return const _RefreshResult.rejected();
      }

      final response = await _refreshDio.post(
        ApiConstants.refresh,
        data: {'refreshToken': refreshToken},
      );

      if (!_isCurrent(generation)) return const _RefreshResult.stale();

      // POST /auth/refresh -> { success, message, data: { user, token, refreshToken } }
      final body = response.data;
      final data = (body is Map && body['data'] is Map)
          ? body['data'] as Map
          : null;
      final newAccessToken = data?['token'] as String?;
      final newRefreshToken = data?['refreshToken'] as String?;
      if (newAccessToken == null || newRefreshToken == null) {
        return const _RefreshResult.rejected();
      }

      final saved = await _storage.saveTokensIf(
        shouldSave: () => _isCurrent(generation),
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      );
      if (!saved) return const _RefreshResult.stale();
      return _RefreshResult.success(newAccessToken);
    } on DioException catch (error) {
      if (!_isCurrent(generation)) return const _RefreshResult.stale();
      final status = error.response?.statusCode;
      final refreshRejected = status == 400 || status == 401 || status == 403;
      if (refreshRejected) return const _RefreshResult.rejected();
      return _RefreshResult.failure(error);
    } catch (error) {
      if (!_isCurrent(generation)) return const _RefreshResult.stale();
      return _RefreshResult.failure(error);
    }
  }

  Future<void> _handleSessionExpired(int generation) async {
    final cleared = await _storage.clearIf(() => _isCurrent(generation));
    if (!cleared || !_isCurrent(generation)) return;
    _onSessionExpired(generation);
  }
}

enum _RefreshStatus { success, rejected, stale, failure }

class _RefreshResult {
  const _RefreshResult._(this.status, {this.accessToken, this.error});

  const _RefreshResult.success(String accessToken)
    : this._(_RefreshStatus.success, accessToken: accessToken);

  const _RefreshResult.rejected() : this._(_RefreshStatus.rejected);

  const _RefreshResult.stale() : this._(_RefreshStatus.stale);

  const _RefreshResult.failure(Object error)
    : this._(_RefreshStatus.failure, error: error);

  final _RefreshStatus status;
  final String? accessToken;
  final Object? error;
}
