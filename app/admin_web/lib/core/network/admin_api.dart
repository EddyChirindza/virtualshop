import 'package:dio/dio.dart';

import '../auth/admin_session.dart';
import '../constants/api_constants.dart';

class AdminApi {
  AdminApi({String? token, Dio? dio, AdminSession? session})
    : dio = dio ?? _buildDio() {
    if (session != null) {
      this.dio.interceptors.add(
        _AdminAuthInterceptor(dio: this.dio, session: session),
      );
    } else if (token != null) {
      this.dio.options.headers['Authorization'] = 'Bearer $token';
    }
  }

  final Dio dio;

  static Dio _buildDio() => Dio(
    BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: const {'Content-Type': 'application/json'},
    ),
  );
}

class _AdminAuthInterceptor extends Interceptor {
  _AdminAuthInterceptor({required this.dio, required this.session});

  final Dio dio;
  final AdminSession session;

  static const _retriedKey = '_admin_auth_retried';
  static const _tokenKey = '_admin_auth_token';

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = session.accessToken;
    options.extra[_tokenKey] = token;
    if (token == null || token.isEmpty) {
      options.headers.remove('Authorization');
    } else {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final options = err.requestOptions;
    if (err.response?.statusCode != 401 ||
        options.extra[_retriedKey] == true ||
        _isAuthRequest(options.path) ||
        !session.isAuthenticated) {
      handler.next(err);
      return;
    }

    if (options.extra[_tokenKey] == session.accessToken) {
      final refreshed = await session.refresh();
      if (!refreshed) {
        handler.next(err);
        return;
      }
    }

    options.extra[_retriedKey] = true;
    try {
      handler.resolve(await dio.fetch<dynamic>(options));
    } on DioException catch (error) {
      handler.next(error);
    }
  }

  bool _isAuthRequest(String path) =>
      path.contains('/auth/login') ||
      path.contains('/auth/register') ||
      path.contains('/auth/refresh') ||
      path.contains('/auth/logout');
}
