import '../../../core/network/admin_api.dart';

class AdminAuthRepository {
  final AdminApi _api = AdminApi();

  Future<String> login(String phone, String password) async {
    final response = await _api.dio.post('/auth/login', data: {
      'identifier': phone,
      'password': password,
    });
    final data = response.data['data'] as Map<String, dynamic>;
    final user = data['user'] as Map<String, dynamic>;
    if (user['role'] != 'admin') {
      throw Exception('Esta conta não tem acesso ao painel administrativo.');
    }
    final token = data['token'] as String?;
    if (token == null || token.isEmpty) {
      throw Exception('A API não devolveu um token de acesso.');
    }
    return token;
  }
}
