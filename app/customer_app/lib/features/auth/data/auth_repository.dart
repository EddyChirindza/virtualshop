import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/network/api_response.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../models/auth_tokens.dart';
import '../models/user.dart';

class AuthRepository {
  AuthRepository({required Dio dio, required SecureStorageService storage})
      : _dio = dio,
        _storage = storage;

  final Dio _dio;
  final SecureStorageService _storage;

  Future<User> register({
    required String name,
    required String email,
    required String password,
    required String phone,
  }) async {
    try {
      final response = await _dio.post(ApiConstants.register, data: {
        'full_name': name,
        'email': email,
        'password': password,
        'phone': phone,
      });
      return _saveSession(unwrapMap(response));
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<User> login({required String identifier, required String password}) async {
    try {
      final response = await _dio.post(ApiConstants.login, data: {
        'identifier': identifier,
        'password': password,
      });
      return _saveSession(unwrapMap(response));
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<User> fetchMe() async {
    try {
      final response = await _dio.get(ApiConstants.me);
      // GET /auth/me -> data: { user: {...} }
      return User.fromJson(unwrapMap(response)['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<void> logout() async {
    final refreshToken = await _storage.getRefreshToken();
    try {
      if (refreshToken != null) {
        await _dio.post(ApiConstants.logout, data: {'refreshToken': refreshToken});
      }
    } on DioException {
      // Best-effort: even if the server call fails, wipe local tokens below.
    } finally {
      await _storage.clear();
    }
  }

  /// Guarda o par de tokens e devolve o utilizador de uma resposta de
  /// login/registo (`data: { user, token, refreshToken }`).
  Future<User> _saveSession(Map<String, dynamic> data) async {
    final tokens = AuthTokens.fromJson(data);
    if (!tokens.isValid) {
      throw ApiException(
        message: 'Resposta de autenticação inválida.',
        type: ApiErrorType.server,
      );
    }
    await _storage.saveTokens(
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    );
    return User.fromJson(data['user'] as Map<String, dynamic>);
  }
}
