import 'package:dio/dio.dart';

import '../../../core/network/admin_api.dart';
import '../models/admin_order.dart';

class OrdersRepository {
  OrdersRepository({String? token, AdminApi? api})
    : assert(token != null || api != null, 'Fornece token ou api.'),
      _api = api ?? AdminApi(token: token!);

  final AdminApi _api;

  Future<AdminOrderPage> list({
    String? status,
    String? search,
    String? from,
    String? to,
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final response = await _api.dio.get(
        '/admin/orders',
        queryParameters: {
          'page': page,
          'limit': limit,
          if (status != null && status.isNotEmpty) 'status': status,
          if (search != null && search.trim().isNotEmpty)
            'search': search.trim(),
          if (from != null && from.isNotEmpty) 'from': from,
          if (to != null && to.isNotEmpty) 'to': to,
        },
      );
      final data = _dataMap(response.data);
      return AdminOrderPage.fromJson(data);
    } on DioException catch (error) {
      throw _apiError(error);
    }
  }

  Future<AdminOrder> get(int id) async {
    try {
      final response = await _api.dio.get('/admin/orders/$id');
      return AdminOrder.fromJson(_dataMap(response.data));
    } on DioException catch (error) {
      throw _apiError(error);
    }
  }

  Future<AdminOrder> accept(int id) async {
    try {
      final response = await _api.dio.post('/admin/orders/$id/accept');
      return AdminOrder.fromJson(_dataMap(response.data));
    } on DioException catch (error) {
      throw _apiError(error);
    }
  }

  Future<AdminOrder> reject(int id, String reason) async {
    try {
      final response = await _api.dio.post(
        '/admin/orders/$id/reject',
        data: {'reason': reason},
      );
      return AdminOrder.fromJson(_dataMap(response.data));
    } on DioException catch (error) {
      throw _apiError(error);
    }
  }

  Future<AdminOrder> updateStatus(int id, String status) async {
    try {
      final response = await _api.dio.patch(
        '/admin/orders/$id/status',
        data: {'status': status},
      );
      return AdminOrder.fromJson(_dataMap(response.data));
    } on DioException catch (error) {
      throw _apiError(error);
    }
  }

  Map<String, dynamic> _dataMap(dynamic body) {
    final map = body is Map
        ? Map<String, dynamic>.from(body)
        : <String, dynamic>{};
    final data = map['data'];
    return data is Map ? Map<String, dynamic>.from(data) : map;
  }

  Exception _apiError(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['message'] != null) {
      return Exception(data['message'].toString());
    }
    return Exception('Não foi possível comunicar com a API.');
  }
}
