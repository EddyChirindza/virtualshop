import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../core/session/session_controller.dart';
import '../data/review_repository.dart';
import '../models/product_review.dart';

final reviewRepositoryProvider = Provider<ReviewRepository>((ref) {
  return ReviewRepository(dio: ref.watch(dioProvider));
});

final productReviewsProvider =
    AsyncNotifierProvider.family<ReviewsController, ProductReviews, int>(
      ReviewsController.new,
    );

class ReviewsController extends FamilyAsyncNotifier<ProductReviews, int> {
  static const _pageSize = 20;
  int _page = 1;
  bool _hasMore = true;
  bool _submitting = false;
  bool _deleting = false;
  final Set<int> _votingIds = <int>{};

  bool get isSubmitting => _submitting;
  bool get isDeleting => _deleting;
  bool isVoting(int reviewId) => _votingIds.contains(reviewId);

  @override
  Future<ProductReviews> build(int productId) async {
    _page = 1;
    _hasMore = true;
    final generation = ref.read(sessionControllerProvider).generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    final result = await ref
        .read(reviewRepositoryProvider)
        .fetchReviews(productId, page: _page, limit: _pageSize);
    if (!sessionController.isCurrent(generation)) {
      return const ProductReviews(
        average: 0,
        count: 0,
        ownReview: null,
        items: <ProductReview>[],
        distribution: <ProductReviewDistribution>[],
        page: 1,
        limit: _pageSize,
        totalPages: 1,
      );
    }
    _hasMore = result.hasMore;
    return result;
  }

  Future<void> refresh() async {
    _page = 1;
    _hasMore = true;
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref
          .read(reviewRepositoryProvider)
          .fetchReviews(arg, page: 1, limit: _pageSize),
    );
  }

  Future<void> loadMore() async {
    if (!_hasMore || state.isLoading) return;
    final current = state.valueOrNull;
    if (current == null) return;
    final nextPage = _page + 1;
    try {
      final result = await ref
          .read(reviewRepositoryProvider)
          .fetchReviews(arg, page: nextPage, limit: _pageSize);
      final ids = current.items.map((item) => item.id).toSet();
      final merged = [
        ...current.items,
        ...result.items.where((item) => !ids.contains(item.id)),
      ];
      state = AsyncData(_copyWithItems(current, merged, result));
      _page = nextPage;
      _hasMore = result.hasMore;
    } catch (error, stackTrace) {
      state = AsyncError(error, stackTrace);
    }
  }

  Future<void> saveReview({
    required int rating,
    required String comment,
  }) async {
    if (_submitting) return;
    _submitting = true;
    try {
      final result = await ref
          .read(reviewRepositoryProvider)
          .saveReview(
            productId: arg,
            rating: rating,
            comment: comment.trim().isEmpty ? null : comment.trim(),
          );
      state = AsyncData(result);
      _page = 1;
      _hasMore = result.hasMore;
    } finally {
      _submitting = false;
    }
  }

  Future<void> deleteReview() async {
    if (_deleting) return;
    _deleting = true;
    try {
      final result = await ref.read(reviewRepositoryProvider).deleteReview(arg);
      state = AsyncData(result);
      _page = 1;
      _hasMore = result.hasMore;
    } finally {
      _deleting = false;
    }
  }

  Future<void> voteReview(ProductReview review, String vote) async {
    if (_votingIds.contains(review.id)) return;
    _votingIds.add(review.id);
    final current = state.valueOrNull;
    if (current == null) {
      _votingIds.remove(review.id);
      return;
    }
    try {
      final nextVote = review.userVote == vote ? null : vote;
      final result = await ref
          .read(reviewRepositoryProvider)
          .voteReview(productId: arg, reviewId: review.id, vote: nextVote);
      final updated = current.items.map((item) {
        if (item.id != review.id) return item;
        return item.copyWith(
          likeCount: result['likeCount'] as int,
          dislikeCount: result['dislikeCount'] as int,
          userVote: result['userVote'] as String?,
        );
      }).toList();
      state = AsyncData(_copyWithItems(current, updated, current));
    } finally {
      _votingIds.remove(review.id);
    }
  }

  ProductReviews _copyWithItems(
    ProductReviews base,
    List<ProductReview> items,
    ProductReviews metadata,
  ) {
    return ProductReviews(
      average: metadata.average,
      count: metadata.count,
      ownReview: metadata.ownReview ?? base.ownReview,
      items: items,
      distribution: metadata.distribution,
      page: metadata.page,
      limit: metadata.limit,
      totalPages: metadata.totalPages,
    );
  }
}
