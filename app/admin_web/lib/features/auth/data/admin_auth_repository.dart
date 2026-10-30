import '../../../core/auth/admin_session.dart';
import '../../../core/network/admin_api.dart';

class AdminAuthRepository {
  AdminAuthRepository({AdminApi? api}) : _api = api ?? AdminApi();

  final AdminApi _api;

  Future<AdminTokens> login(String phone, String password) async {
    final response = await _api.dio.post(
      '/auth/login',
      data: {'identifier': phone, 'password': password},
    );
    final data = response.data['data'] as Map<String, dynamic>;
    final user = data['user'] as Map<String, dynamic>;
    if (user['role'] != 'admin') {
      throw Exception('Esta conta não tem acesso ao painel administrativo.');
    }
    final token = data['token'] as String?;
    final refreshToken = data['refreshToken'] as String?;
    if (token == null || token.isEmpty) {
      throw Exception('A API não devolveu um token de acesso.');
    }
    if (refreshToken == null || refreshToken.isEmpty) {
      throw Exception('A API não devolveu um token de renovação.');
    }
    return AdminTokens(accessToken: token, refreshToken: refreshToken);
  }
}
