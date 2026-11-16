import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/network/api_response.dart';
import '../domain/models/payment_method.dart';

class PaymentMethodRepository {
  PaymentMethodRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<List<PaymentMethod>> fetchPaymentMethods() async {
    try {
      final response = await _dio.get(ApiConstants.userPaymentMethods);
      final rawItems = unwrapList(response);
      return rawItems
          .whereType<Map>()
          .map(
            (item) => PaymentMethod.fromJson(Map<String, dynamic>.from(item)),
          )
          .toList();
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<PaymentMethod> createPaymentMethod(Map<String, dynamic> fields) async {
    try {
      final data = unwrapMap(
        await _dio.post(ApiConstants.userPaymentMethods, data: fields),
      );
      return PaymentMethod.fromJson(_methodFrom(data));
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<PaymentMethod> updatePaymentMethod(
    int id,
    Map<String, dynamic> fields,
  ) async {
    try {
      final data = unwrapMap(
        await _dio.patch(ApiConstants.userPaymentMethod(id), data: fields),
      );
      return PaymentMethod.fromJson(_methodFrom(data));
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<PaymentMethod> setDefaultPaymentMethod(int id) async {
    try {
      final data = unwrapMap(
        await _dio.patch(ApiConstants.userPaymentMethodDefault(id)),
      );
      return PaymentMethod.fromJson(_methodFrom(data));
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<void> deletePaymentMethod(int id) async {
    try {
      await _dio.delete(ApiConstants.userPaymentMethod(id));
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Map<String, dynamic> _methodFrom(Map<String, dynamic> data) {
    final method = data['paymentMethod'] ?? data['payment_method'];
    return method is Map ? Map<String, dynamic>.from(method) : data;
  }
}
