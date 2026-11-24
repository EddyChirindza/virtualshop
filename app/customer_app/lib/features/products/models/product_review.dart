import '../../../core/utils/format.dart';

class ProductReview {
  const ProductReview({
    required this.id,
    required this.rating,
    required this.comment,
    required this.createdAt,
    required this.updatedAt,
    required this.userId,
    required this.userName,
    required this.isOwn,
    required this.likeCount,
    required this.dislikeCount,
    required this.userVote,
  });

  final int id;
  final int rating;
  final String? comment;
  final String createdAt;
  final String updatedAt;
  final int userId;
  final String userName;
  final bool isOwn;
  final int likeCount;
  final int dislikeCount;
  final String? userVote;

  bool get hasComment => comment != null && comment!.trim().isNotEmpty;

  ProductReview copyWith({
    int? rating,
    String? comment,
    int? likeCount,
    int? dislikeCount,
    String? userVote,
  }) {
    return ProductReview(
      id: id,
      rating: rating ?? this.rating,
      comment: comment ?? this.comment,
      createdAt: createdAt,
      updatedAt: updatedAt,
      userId: userId,
      userName: userName,
      isOwn: isOwn,
      likeCount: likeCount ?? this.likeCount,
      dislikeCount: dislikeCount ?? this.dislikeCount,
      userVote: userVote,
    );
  }

  factory ProductReview.fromJson(Map<String, dynamic> json) {
    final user = json['user'] is Map
        ? json['user'] as Map
        : const <String, dynamic>{};
    return ProductReview(
      id: parseInt(json['id']),
      rating: parseInt(json['rating']),
      comment: json['comment'] as String?,
      createdAt: json['createdAt']?.toString() ?? '',
      updatedAt: json['updatedAt']?.toString() ?? '',
      userId: parseInt(user['id']),
      userName: user['name']?.toString() ?? 'Cliente',
      isOwn: json['isOwn'] == true,
      likeCount: parseInt(json['likeCount']),
      dislikeCount: parseInt(json['dislikeCount']),
      userVote: json['userVote'] as String?,
    );
  }
}

class ProductReviewDistribution {
  const ProductReviewDistribution({required this.rating, required this.count});

  final int rating;
  final int count;

  factory ProductReviewDistribution.fromJson(Map<String, dynamic> json) {
    return ProductReviewDistribution(
      rating: parseInt(json['rating']),
      count: parseInt(json['count']),
    );
  }
}

class ProductReviews {
  const ProductReviews({
    required this.average,
    required this.count,
    required this.ownReview,
    required this.items,
    required this.distribution,
    required this.page,
    required this.limit,
    required this.totalPages,
  });

  final double average;
  final int count;
  final ProductReview? ownReview;
  final List<ProductReview> items;
  final List<ProductReviewDistribution> distribution;
  final int page;
  final int limit;
  final int totalPages;

  bool get hasMore => page < totalPages;

  factory ProductReviews.fromJson(Map<String, dynamic> json) {
    final distribution = json['distribution'] is List
        ? (json['distribution'] as List)
              .whereType<Map>()
              .map(
                (value) => ProductReviewDistribution.fromJson(
                  value.cast<String, dynamic>(),
                ),
              )
              .toList()
        : const <ProductReviewDistribution>[];
    final ownReviewJson = json['ownReview'];
    return ProductReviews(
      average: parseDouble(json['average']),
      count: parseInt(json['count']),
      ownReview: ownReviewJson is Map
          ? ProductReview.fromJson(ownReviewJson.cast<String, dynamic>())
          : null,
      items: json['items'] is List
          ? (json['items'] as List)
                .whereType<Map>()
                .map(
                  (value) =>
                      ProductReview.fromJson(value.cast<String, dynamic>()),
                )
                .toList()
          : const <ProductReview>[],
      distribution: distribution,
      page: parseInt(json['page'] ?? 1),
      limit: parseInt(json['limit'] ?? 20),
      totalPages: parseInt(json['totalPages'] ?? 1),
    );
  }
}
