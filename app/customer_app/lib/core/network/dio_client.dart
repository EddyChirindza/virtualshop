import 'package:dio/dio.dart';

import '../constants/api_constants.dart';
import '../storage/secure_storage_service.dart';

/// Called when the refresh token itself is rejected (expired/revoked) —
/// the app has no way to recover except sending the user back to login.
typedef OnSessionExpired = void Function();

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
class DioClient {
  DioClient({
    required SecureStorageService storage,
    required OnSessionExpired onSessionExpired,
  })  : _storage = storage,
        _onSessionExpired = onSessionExpired {
    dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: ApiConstants.connectTimeout,
        receiveTimeout: ApiConstants.receiveTimeout,
        headers: {'Content-Type': 'application/json'},
      ),
    );

    // Separate, interceptor-free client just for the refresh call itself —
    // otherwise a 401 on /auth/refresh would try to refresh itself.
    _refreshDio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: ApiConstants.connectTimeout,
        receiveTimeout: ApiConstants.receiveTimeout,
        headers: {'Content-Type': 'application/json'},
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
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
          final alreadyRetried = error.requestOptions.extra[_retriedKey] == true;
          // Um pedido só é repetido UMA vez — evita ciclos infinitos se o
          // servidor continuar a responder 401 mesmo com o token novo.
          if (!isUnauthorized ||
              alreadyRetried ||
              _isAuthEndpoint(error.requestOptions.path)) {
            return handler.next(error);
          }

          try {
            final newAccessToken = await _refreshAccessToken();
            if (newAccessToken == null) {
              await _handleSessionExpired();
              return handler.next(error);
            }

            // Retry the original request with the fresh token.
            final retryOptions = error.requestOptions;
            retryOptions.extra[_retriedKey] = true;
            retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';
            final response = await dio.fetch(retryOptions);
            return handler.resolve(response);
          } on DioException catch (e) {
            final status = e.response?.statusCode;
            final refreshRejected = status == 400 || status == 401 || status == 403;
            if (refreshRejected && _isAuthEndpoint(e.requestOptions.path)) {
              // O servidor recusou o refresh token -> sessão acabou.
              await _handleSessionExpired();
              return handler.next(error);
            }
            // Falha de rede (ou erro no pedido repetido): devolve o erro
            // real ao chamador sem terminar a sessão.
            return handler.next(e);
          } catch (_) {
            return handler.next(error);
          }
        },
      ),
    );
  }

  static const _retriedKey = 'retried_after_refresh';

  late final Dio dio;
  late final Dio _refreshDio;
  final SecureStorageService _storage;
  final OnSessionExpired _onSessionExpired;

  // Ensures concurrent 401s share a single in-flight refresh call.
  Future<String?>? _refreshInProgress;

  bool _isAuthEndpoint(String path) =>
      path.contains(ApiConstants.login) ||
      path.contains(ApiConstants.register) ||
      path.contains(ApiConstants.refresh) ||
      path.contains(ApiConstants.logout);

  Future<String?> _refreshAccessToken() {
    _refreshInProgress ??= _doRefresh().whenComplete(() {
      _refreshInProgress = null;
    });
    return _refreshInProgress!;
  }

  Future<String?> _doRefresh() async {
    final refreshToken = await _storage.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) return null;

    final response = await _refreshDio.post(
      ApiConstants.refresh,
      data: {'refreshToken': refreshToken},
    );

    // POST /auth/refresh -> { success, message, data: { user, token, refreshToken } }
    final body = response.data;
    final data = (body is Map && body['data'] is Map) ? body['data'] as Map : null;
    final newAccessToken = data?['token'] as String?;
    final newRefreshToken = data?['refreshToken'] as String?;
    if (newAccessToken == null || newRefreshToken == null) return null;

    await _storage.saveTokens(
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    );
    return newAccessToken;
  }

  Future<void> _handleSessionExpired() async {
    await _storage.clear();
    _onSessionExpired();
  }
}
