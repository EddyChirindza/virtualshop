import '../../../core/network/admin_api.dart';
import '../models/dashboard_data.dart';

class DashboardRepository {
  DashboardRepository({required String token}) : _api = AdminApi(token: token);

  final AdminApi _api;

  Future<DashboardData> load({String period = '30d'}) async {
    final response = await _api.dio.get('/admin/dashboard', queryParameters: {'period': period});
    final body = response.data as Map<String, dynamic>;
    return DashboardData.fromJson(body['data'] as Map<String, dynamic>);
  }
}
