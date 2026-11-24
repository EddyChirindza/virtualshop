import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/network/api_response.dart';
import '../../../core/utils/format.dart';
import '../models/product_review.dart';

class ReviewRepository {
  ReviewRepository({required this._dio});

  final Dio _dio;

  Future<ProductReviews> fetchReviews(
    int productId, {
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get(
        '${ApiConstants.products}/$productId/reviews',
        queryParameters: {'page': page, 'limit': limit},
      );
      return ProductReviews.fromJson(unwrapMap(response));
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<ProductReviews> saveReview({
    required int productId,
    required int rating,
    required String? comment,
  }) async {
    try {
      final response = await _dio.post(
        '${ApiConstants.products}/$productId/reviews',
        data: {'rating': rating, 'comment': comment},
      );
      return ProductReviews.fromJson(unwrapMap(response));
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<ProductReviews> deleteReview(int productId) async {
    try {
      final response = await _dio.delete(
        '${ApiConstants.products}/$productId/reviews',
      );
      return ProductReviews.fromJson(unwrapMap(response));
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<Map<String, dynamic>> voteReview({
    required int productId,
    required int reviewId,
    required String? vote,
  }) async {
    try {
      final path = '${ApiConstants.products}/$productId/reviews/$reviewId/vote';
      final response = vote == null
          ? await _dio.delete(path)
          : await _dio.post(path, data: {'vote': vote});
      final data = unwrapMap(response);
      return {
        'likeCount': parseInt(data['likeCount']),
        'dislikeCount': parseInt(data['dislikeCount']),
        'userVote': data['userVote'] as String?,
      };
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }
}
