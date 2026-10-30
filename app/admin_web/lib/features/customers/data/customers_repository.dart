import '../../../core/network/admin_api.dart';
import '../models/admin_customer.dart';

class CustomersRepository {
  CustomersRepository({String? token, AdminApi? api})
    : assert(token != null || api != null, 'Fornece token ou api.'),
      _api = api ?? AdminApi(token: token!);

  final AdminApi _api;

  Future<List<AdminCustomer>> load() async {
    final response = await _api.dio.get('/admin/customers');
    final body = Map<String, dynamic>.from(response.data as Map);
    final rawData = body['data'];
    final rawCustomers = rawData is List
        ? rawData
        : rawData is Map
            ? (rawData['customers'] ?? rawData['users'] ?? rawData['items'])
            : null;
    if (rawCustomers is! List) {
      throw const FormatException('Formato de resposta de clientes inválido.');
    }
    return rawCustomers
        .whereType<Map>()
        .map((customer) => AdminCustomer.fromJson(
              Map<String, dynamic>.from(customer),
            ))
        .toList();
  }
}
