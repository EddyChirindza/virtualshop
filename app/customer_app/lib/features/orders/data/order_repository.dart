import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/network/api_response.dart';
import '../domain/models/order.dart';

class OrderRepository {
  OrderRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<List<CustomerOrder>> fetchOrders() async {
    try {
      final data = unwrapMap(await _dio.get(ApiConstants.orders));
      final rawItems = data['items'];
      if (rawItems is! List) return const [];
      return rawItems
          .whereType<Map>()
          .map(
            (item) => CustomerOrder.fromJson(Map<String, dynamic>.from(item)),
          )
          .toList();
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<CustomerOrder> fetchOrder(int id) async {
    try {
      final data = unwrapMap(await _dio.get(ApiConstants.order(id)));
      return CustomerOrder.fromJson(data);
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }
}
