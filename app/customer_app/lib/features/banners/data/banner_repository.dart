import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/network/api_response.dart';
import '../models/store_banner.dart';

class BannerRepository {
  BannerRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<List<StoreBanner>> fetchPublic() async {
    try {
      final response = await _dio.get(ApiConstants.banners);
      final items = unwrapMap(response)['items'];
      if (items is! List) {
        throw const FormatException(
          'Resposta da API inválida (esperava uma lista de banners).',
        );
      }
      return items
          .whereType<Map<String, dynamic>>()
          .map(StoreBanner.fromJson)
          .toList();
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }
}
