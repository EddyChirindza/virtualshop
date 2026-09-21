import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/network/api_response.dart';
import '../models/category.dart';

class CategoryRepository {
  CategoryRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  /// Árvore de categorias (pai -> filhos).
  Future<List<Category>> fetchTree() async {
    try {
      final response = await _dio.get(
        ApiConstants.categories,
        queryParameters: {'tree': 'true'},
      );
      return unwrapList(response)
          .whereType<Map<String, dynamic>>()
          .map(Category.fromJson)
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
