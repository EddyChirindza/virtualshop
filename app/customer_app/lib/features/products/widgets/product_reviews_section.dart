import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import '../../../../core/app_text.dart';
import '../../../../core/errors/api_exception.dart';
import '../../../../core/session/session_controller.dart';
import '../../../../core/auth_guard.dart';
import '../models/product_review.dart';
import '../providers/product_providers.dart';
import '../providers/review_providers.dart';

class ProductReviewsSection extends ConsumerStatefulWidget {
  const ProductReviewsSection({super.key, required this.productId});

  final int productId;

  @override
  ConsumerState<ProductReviewsSection> createState() =>
      _ProductReviewsSectionState();
}

class _ProductReviewsSectionState extends ConsumerState<ProductReviewsSection> {
  int _rating = 0;
  bool _editing = false;
  bool _showOwnReviewForm = false;
  final _commentController = TextEditingController();

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  void _prepareForm(ProductReview? ownReview) {
    setState(() {
      _editing = ownReview != null;
      _showOwnReviewForm = true;
      _rating = ownReview?.rating ?? 0;
      _commentController.text = ownReview?.comment ?? '';
    });
  }

  Future<void> _requireLogin() async {
    await requireAuthentication(
      context,
      ref,
      message: 'Precisas de iniciar sessão para avaliar produtos ou interagir com as avaliações de outros clientes.',
    );
  }

  Future<void> _saveReview() async {
    if (_rating < 1) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            appText(context, 'Escolha uma classificação.', 'Choose a rating.'),
          ),
        ),
      );
      return;
    }
    try {
      await ref
          .read(productReviewsProvider(widget.productId).notifier)
          .saveReview(rating: _rating, comment: _commentController.text);
      ref.invalidate(productDetailProvider(widget.productId));
      if (!mounted) return;
      setState(() {
        _editing = true;
        _showOwnReviewForm = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            appText(context, 'Avaliação guardada.', 'Review saved.'),
          ),
        ),
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  Future<void> _deleteReview() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(
          appText(dialogContext, 'Eliminar avaliação?', 'Delete review?'),
        ),
        content: Text(
          appText(
            dialogContext,
            'Esta ação não pode ser anulada.',
            'This action cannot be undone.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text(appText(dialogContext, 'Cancelar', 'Cancel')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(appText(dialogContext, 'Eliminar', 'Delete')),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ref
          .read(productReviewsProvider(widget.productId).notifier)
          .deleteReview();
      ref.invalidate(productDetailProvider(widget.productId));
      if (!mounted) return;
      setState(() {
        _rating = 0;
        _editing = false;
        _showOwnReviewForm = false;
        _commentController.clear();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            appText(context, 'Avaliação eliminada.', 'Review deleted.'),
          ),
        ),
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  Future<void> _vote(ProductReview review, String vote) async {
    if (!ref.read(sessionControllerProvider).isActive) {
      await _requireLogin();
      return;
    }
    try {
      await ref
          .read(productReviewsProvider(widget.productId).notifier)
          .voteReview(review, vote);
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final reviewsAsync = ref.watch(productReviewsProvider(widget.productId));
    final session = ref.watch(sessionControllerProvider);
    final theme = Theme.of(context);

    return reviewsAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (error, _) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              error is ApiException
                  ? error.message
                  : appText(
                      context,
                      'Não foi possível carregar as avaliações.',
                      'Could not load reviews.',
                    ),
            ),
            TextButton(
              onPressed: () =>
                  ref.invalidate(productReviewsProvider(widget.productId)),
              child: Text(appText(context, 'Tentar novamente', 'Try again')),
            ),
          ],
        ),
      ),
      data: (reviews) {
        final ownReview = reviews.ownReview;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              appText(context, 'Avaliações', 'Reviews'),
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  reviews.average.toStringAsFixed(1),
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _Stars(rating: reviews.average.round(), size: 18),
                      Text(
                        '${reviews.count} ${reviews.count == 1 ? appText(context, 'avaliação', 'review') : appText(context, 'avaliações', 'reviews')}',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...reviews.distribution.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 5),
                child: Row(
                  children: [
                    SizedBox(width: 30, child: Text('${item.rating}★')),
                    Expanded(
                      child: LinearProgressIndicator(
                        value: reviews.count == 0
                            ? 0
                            : item.count / reviews.count,
                        minHeight: 7,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      width: 24,
                      child: Text('${item.count}', textAlign: TextAlign.right),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (ownReview != null)
              Card(
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              appText(
                                context,
                                'A tua avaliação',
                                'Your review',
                              ),
                              style: theme.textTheme.titleSmall,
                            ),
                          ),
                          IconButton(
                            tooltip: appText(context, 'Editar', 'Edit'),
                            onPressed: () => _prepareForm(ownReview),
                            icon: const Icon(Icons.edit_outlined),
                          ),
                          IconButton(
                            tooltip: appText(context, 'Eliminar', 'Delete'),
                            onPressed: () {
                              if (!session.isActive) {
                                _requireLogin();
                              } else {
                                _deleteReview();
                              }
                            },
                            icon: const Icon(Icons.delete_outline),
                          ),
                        ],
                      ),
                      _Stars(rating: ownReview.rating, size: 20),
                      if (ownReview.comment != null &&
                          ownReview.comment!.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(ownReview.comment!),
                        ),
                    ],
                  ),
                ),
              )
            else
              OutlinedButton.icon(
                onPressed: () {
                  if (!session.isActive) {
                    _requireLogin();
                  } else {
                    _prepareForm(null);
                  }
                },
                icon: const Icon(Icons.star_outline),
                label: Text(
                  appText(
                    context,
                    'Avaliar este produto',
                    'Review this product',
                  ),
                ),
              ),
            if (_showOwnReviewForm) ...[
              const SizedBox(height: 16),
              Text(
                _editing
                    ? appText(context, 'Editar avaliação', 'Edit review')
                    : appText(context, 'Nova avaliação', 'New review'),
                style: theme.textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  final value = index + 1;
                  return IconButton(
                    tooltip: '$value',
                    onPressed: () => setState(() => _rating = value),
                    icon: Icon(
                      value <= _rating
                          ? Icons.star_rounded
                          : Icons.star_outline_rounded,
                      color: Colors.amber,
                      size: 34,
                    ),
                  );
                }),
              ),
              TextField(
                controller: _commentController,
                maxLength: 1000,
                maxLines: 4,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  labelText: appText(
                    context,
                    'Comentário (opcional)',
                    'Comment (optional)',
                  ),
                  helperText: '${_commentController.text.length}/1000',
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      onPressed:
                          ref
                              .read(
                                productReviewsProvider(widget.productId)
                                    .notifier,
                              )
                              .isSubmitting
                          ? null
                          : _saveReview,
                      child: Text(
                        appText(context, 'Guardar avaliação', 'Save review'),
                      ),
                    ),
                  ),
                  if (_editing) ...[
                    const SizedBox(width: 8),
                    OutlinedButton(
                      onPressed: () => setState(() {
                        _showOwnReviewForm = false;
                        _rating = ownReview?.rating ?? 0;
                        _commentController.text = ownReview?.comment ?? '';
                      }),
                      child: Text(appText(context, 'Cancelar', 'Cancel')),
                    ),
                  ],
                ],
              ),
            ],
            const SizedBox(height: 20),
            if (reviews.items.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  appText(
                    context,
                    'Ainda não há avaliações para este produto.',
                    'There are no reviews for this product yet.',
                  ),
                ),
              )
            else
              ...reviews.items.map(
                (review) => _ReviewTile(
                  review: review,
                  voting: ref
                      .read(productReviewsProvider(widget.productId).notifier)
                      .isVoting(review.id),
                  onVote: (vote) => _vote(review, vote),
                ),
              ),
            if (reviews.hasMore)
              Center(
                child: TextButton(
                  onPressed: () => ref
                      .read(productReviewsProvider(widget.productId).notifier)
                      .loadMore(),
                  child: Text(appText(context, 'Carregar mais', 'Load more')),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _Stars extends StatelessWidget {
  const _Stars({required this.rating, required this.size});
  final int rating;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (index) {
        return Icon(
          index < rating ? Icons.star_rounded : Icons.star_outline_rounded,
          color: Colors.amber,
          size: size,
        );
      }),
    );
  }
}

class _ReviewTile extends StatelessWidget {
  const _ReviewTile({
    required this.review,
    required this.voting,
    required this.onVote,
  });

  final ProductReview review;
  final bool voting;
  final ValueChanged<String> onVote;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final date = DateTime.tryParse(review.createdAt);
    final dateText = date == null
        ? ''
        : '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    review.isOwn
                        ? appText(context, 'EU', 'ME')
                        : review.userName,
                    style: theme.textTheme.titleSmall,
                  ),
                ),
                _Stars(rating: review.rating, size: 17),
              ],
            ),
            if (dateText.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  dateText,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            if (review.comment != null && review.comment!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(review.comment!),
              ),
            if (review.hasComment && !review.isOwn) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: voting ? null : () => onVote('like'),
                    icon: Icon(
                      Icons.thumb_up_outlined,
                      color: review.userVote == 'like'
                          ? theme.colorScheme.primary
                          : null,
                    ),
                    label: Text('${review.likeCount}'),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    onPressed: voting ? null : () => onVote('dislike'),
                    icon: Icon(
                      Icons.thumb_down_outlined,
                      color: review.userVote == 'dislike'
                          ? theme.colorScheme.primary
                          : null,
                    ),
                    label: Text('${review.dislikeCount}'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
