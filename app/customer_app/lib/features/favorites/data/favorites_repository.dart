import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/api_exception.dart';
import '../models/favorite.dart';

class FavoritesRepository {
  FavoritesRepository({required this._dio});

  final Dio _dio;

  Future<List<Favorite>> list({int page = 1, int pageSize = 20}) async {
    try {
      final response = await _dio.get(
        ApiConstants.favorites,
        queryParameters: {'page': page, 'pageSize': pageSize},
      );
      final body = response.data;
      final root = body is Map
          ? Map<String, dynamic>.from(body)
          : <String, dynamic>{};
      final data = root['data'] is Map
          ? Map<String, dynamic>.from(root['data'] as Map)
          : root;
      final rawItems = data['items'] is List ? data['items'] as List : const [];
      return rawItems
          .whereType<Map>()
          .map((item) => Favorite.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<void> add(int productId) async {
    try {
      await _dio.post(ApiConstants.favorites, data: {'productId': productId});
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<void> remove(int productId) async {
    try {
      await _dio.delete(ApiConstants.favorite(productId));
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<bool> isFavorite(int productId) async {
    try {
      final response = await _dio.get(ApiConstants.favorite(productId));
      final body = response.data;
      final root = body is Map
          ? Map<String, dynamic>.from(body)
          : <String, dynamic>{};
      final data = root['data'] is Map
          ? Map<String, dynamic>.from(root['data'] as Map)
          : root;
      return data['isFavorite'] as bool? ??
          data['is_favorite'] as bool? ??
          false;
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }
}
