import 'package:customer_app/features/products/data/review_repository.dart';
import 'package:customer_app/features/products/models/product_review.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses review summary, own review and distribution', () {
    final reviews = ProductReviews.fromJson({
      'average': '4.5',
      'count': 2,
      'ownReview': {
        'id': 9,
        'rating': 5,
        'comment': 'Excelente',
        'createdAt': '2026-11-19',
        'updatedAt': '2026-11-19',
        'user': {'id': 7, 'name': 'Cliente'},
        'isOwn': true,
        'likeCount': 0,
        'dislikeCount': 0,
        'userVote': null,
      },
      'items': [
        {
          'id': 9,
          'rating': 5,
          'comment': 'Excelente',
          'createdAt': '2026-11-19',
          'updatedAt': '2026-11-19',
          'user': {'id': 7, 'name': 'Cliente'},
          'isOwn': true,
          'likeCount': 0,
          'dislikeCount': 0,
          'userVote': null,
        },
      ],
      'distribution': [
        {'rating': 5, 'count': 1},
        {'rating': 4, 'count': 1},
      ],
      'page': 1,
      'limit': 20,
      'totalPages': 1,
    });

    expect(reviews.average, 4.5);
    expect(reviews.count, 2);
    expect(reviews.ownReview?.rating, 5);
    expect(reviews.items.single.comment, 'Excelente');
    expect(reviews.distribution.first.count, 1);
  });

  test('review repository sends real API paths and vote payload', () async {
    RequestOptions? captured;
    final dio = Dio(BaseOptions(baseUrl: 'https://example.test'))
      ..interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            captured = options;
            handler.resolve(
              Response<dynamic>(
                requestOptions: options,
                data: {
                  'success': true,
                  'message': 'OK',
                  'data': {
                    'likeCount': 1,
                    'dislikeCount': 0,
                    'userVote': 'like',
                  },
                },
              ),
            );
          },
        ),
      );

    final repository = ReviewRepository(dio: dio);
    final result = await repository.voteReview(
      productId: 12,
      reviewId: 34,
      vote: 'like',
    );

    expect(captured?.method, 'POST');
    expect(captured?.path, '/products/12/reviews/34/vote');
    expect(captured?.data, {'vote': 'like'});
    expect(result['likeCount'], 1);
  });

  test('review repository supports removing a vote', () async {
    RequestOptions? captured;
    final dio = Dio(BaseOptions(baseUrl: 'https://example.test'))
      ..interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            captured = options;
            handler.resolve(
              Response<dynamic>(
                requestOptions: options,
                data: {
                  'success': true,
                  'message': 'OK',
                  'data': {'likeCount': 0, 'dislikeCount': 0, 'userVote': null},
                },
              ),
            );
          },
        ),
      );

    final repository = ReviewRepository(dio: dio);
    await repository.voteReview(productId: 12, reviewId: 34, vote: null);

    expect(captured?.method, 'DELETE');
    expect(captured?.path, '/products/12/reviews/34/vote');
  });
}
