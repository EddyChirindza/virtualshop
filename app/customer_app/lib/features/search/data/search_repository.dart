import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/api_exception.dart';
import '../../products/models/product.dart';
import '../domain/models/product_search_result.dart';
import '../domain/models/search_filters.dart';

class SearchRepository {
  SearchRepository({required this.dio});

  final Dio dio;

  Future<ProductSearchResult> search({
    required String query,
    required SearchFilters filters,
    required int page,
    required int limit,
    required CancelToken cancelToken,
  }) async {
    final parameters = <String, dynamic>{'page': page, 'limit': limit};
    if (query.trim().isNotEmpty) parameters['q'] = query.trim();
    if (filters.categoryId != null) parameters['category'] = filters.categoryId;
    if (filters.minPrice != null) parameters['minPrice'] = filters.minPrice;
    if (filters.maxPrice != null) parameters['maxPrice'] = filters.maxPrice;
    parameters['sort'] = filters.sort.apiValue;

    try {
      final response = await dio.get(
        ApiConstants.products,
        queryParameters: parameters,
        cancelToken: cancelToken,
      );
      return _parseResult(response.data);
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  ProductSearchResult _parseResult(dynamic responseBody) {
    if (responseBody is! Map) {
      throw const FormatException('Resposta da pesquisa inválida.');
    }

    Map<dynamic, dynamic> payload = responseBody;
    final outerData = responseBody['data'];
    if (outerData is Map) payload = outerData;

    final rawProducts = payload['data'];
    if (rawProducts is! List) {
      throw const FormatException('Resposta da pesquisa sem produtos.');
    }

    final products = rawProducts
        .whereType<Map>()
        .map((item) => Product.fromJson(Map<String, dynamic>.from(item)))
        .toList();
    return ProductSearchResult(
      products: products,
      page: _readInt(payload['page'], 1),
      limit: _readInt(payload['limit'], products.length),
      total: _readInt(payload['total'], products.length),
      totalPages: _readInt(payload['totalPages'], 1),
    );
  }

  int _readInt(dynamic value, int fallback) =>
      value is num ? value.toInt() : int.tryParse('$value') ?? fallback;
}
