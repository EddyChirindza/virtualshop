import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/error_retry.dart';
import '../models/product.dart';
import '../providers/product_providers.dart';
import '../widgets/product_image.dart';

class ProductDetailScreen extends ConsumerWidget {
  const ProductDetailScreen({super.key, required this.productId});

  final int productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final product = ref.watch(productDetailProvider(productId));

    return Scaffold(
      appBar: AppBar(),
      body: product.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorRetry(
          message: error is ApiException ? error.message : 'Não foi possível carregar o produto.',
          onRetry: () => ref.invalidate(productDetailProvider(productId)),
        ),
        data: (p) => _ProductDetailBody(product: p),
      ),
    );
  }
}

class _ProductDetailBody extends StatelessWidget {
  const _ProductDetailBody({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return ListView(
      children: [
        AspectRatio(
          aspectRatio: 4 / 3,
          child: ProductImage(url: product.imageUrl),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (product.categoryName != null)
                Text(
                  product.categoryName!,
                  style: theme.textTheme.labelLarge?.copyWith(color: scheme.primary),
                ),
              const SizedBox(height: 4),
              Text(product.name, style: theme.textTheme.headlineSmall),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.star_rounded, size: 20, color: Colors.amber),
                  const SizedBox(width: 4),
                  Text(product.rating.toStringAsFixed(1), style: theme.textTheme.bodyMedium),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                formatMoney(product.price),
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: scheme.primary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                product.inStock ? 'Em stock (${product.stock} disponíveis)' : 'Esgotado',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: product.inStock ? scheme.onSurfaceVariant : scheme.error,
                ),
              ),
              if ((product.description ?? '').isNotEmpty) ...[
                const SizedBox(height: 24),
                Text('Descrição', style: theme.textTheme.titleMedium),
                const SizedBox(height: 8),
                Text(product.description!, style: theme.textTheme.bodyLarge),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
