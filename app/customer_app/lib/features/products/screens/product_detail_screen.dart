import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/error_retry.dart';
import '../../cart/providers/cart_provider.dart';
import '../models/product.dart';
import '../providers/product_providers.dart';
import '../widgets/product_image.dart';

class ProductDetailScreen extends ConsumerWidget {
  const ProductDetailScreen({super.key, required this.productId});

  final int productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final product = ref.watch(productDetailProvider(productId));
    final cart = ref.watch(cartControllerProvider);
    final item = cart.getItemByProductId(productId);
    final quantity = item?.quantity ?? 0;
    final addAllowed = product.maybeWhen(
      data: (p) => p.inStock && (quantity < p.stock),
      orElse: () => false,
    );

    return Scaffold(
      appBar: AppBar(),
      body: product.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorRetry(
          message: error is ApiException ? error.message : 'Não foi possível carregar o produto.',
          onRetry: () => ref.invalidate(productDetailProvider(productId)),
        ),
        data: (p) => _ProductDetailBody(
          product: p,
          quantity: quantity,
          addAllowed: addAllowed,
          onAdd: () {
            final added = ref.read(cartControllerProvider.notifier).addProduct(p);
            if (!added) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Limite de stock atingido para este produto.')),
              );
            }
          },
          onIncrement: () => ref.read(cartControllerProvider.notifier).addProduct(p),
          onDecrement: () => ref.read(cartControllerProvider.notifier).updateQuantity(p.id, quantity - 1),
        ),
      ),
    );
  }
}

class _ProductDetailBody extends StatelessWidget {
  const _ProductDetailBody({
    required this.product,
    required this.quantity,
    required this.addAllowed,
    required this.onAdd,
    required this.onIncrement,
    required this.onDecrement,
  });

  final Product product;
  final int quantity;
  final bool addAllowed;
  final VoidCallback onAdd;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final inCart = quantity > 0;

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
              if (inCart) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECF7ED),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Text('No carrinho: $quantity', style: theme.textTheme.titleSmall?.copyWith(color: const Color(0xFF1E7A4B))),
                      const Spacer(),
                      IconButton.filledTonal(
                        onPressed: quantity > 0 ? onDecrement : null,
                        icon: const Icon(Icons.remove),
                        constraints: const BoxConstraints.tightFor(width: 36, height: 36),
                      ),
                      const SizedBox(width: 8),
                      Text('$quantity', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                      const SizedBox(width: 8),
                      IconButton.filledTonal(
                        onPressed: addAllowed ? onIncrement : null,
                        icon: const Icon(Icons.add),
                        constraints: const BoxConstraints.tightFor(width: 36, height: 36),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 20),
              if (product.inStock)
                FilledButton.icon(
                  onPressed: inCart ? null : onAdd,
                  icon: const Icon(Icons.add_shopping_cart),
                  label: Text(inCart ? 'Adicionado ao carrinho' : 'Adicionar ao carrinho'),
                )
              else
                FilledButton.icon(
                  onPressed: null,
                  icon: const Icon(Icons.remove_shopping_cart_outlined),
                  label: const Text('Produto indisponível'),
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
