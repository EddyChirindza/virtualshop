import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/network/api_response.dart';
import '../models/product.dart';

class ProductRepository {
  ProductRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<List<Product>> fetchPopular() => _getList(ApiConstants.popularProducts);

  Future<List<Product>> fetchNewArrivals() => _getList(ApiConstants.newArrivals);

  /// Produtos de uma categoria (a API inclui também as subcategorias).
  Future<List<Product>> fetchByCategory(int categoryId, {int page = 1, int pageSize = 50}) {
    return _getList(
      ApiConstants.products,
      query: {'category_id': categoryId, 'page': page, 'page_size': pageSize},
    );
  }

  Future<Product> fetchById(int id) async {
    try {
      final response = await _dio.get('${ApiConstants.products}/$id');
      return Product.fromJson(unwrapMap(response));
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<List<Product>> _getList(String path, {Map<String, dynamic>? query}) async {
    try {
      final response = await _dio.get(path, queryParameters: query);
      return unwrapList(response)
          .whereType<Map<String, dynamic>>()
          .map(Product.fromJson)
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
