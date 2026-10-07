import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/app_text.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/error_retry.dart';
import '../../cart/providers/cart_provider.dart';
import '../../cart/screens/cart_screen.dart';
import '../../auth/screens/login_screen.dart';
import '../../favorites/providers/favorites_provider.dart';
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
    final isFavorite = product.maybeWhen(
      data: (value) => ref.watch(
        favoritesProvider.select(
          (state) =>
              state.valueOrNull?.any(
                (favorite) => favorite.product.id == value.id,
              ) ??
              false,
        ),
      ),
      orElse: () => false,
    );

    return Scaffold(
      appBar: AppBar(),
      body: product.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorRetry(
          message: error is ApiException
              ? error.message
              : appText(
                  context,
                  'Não foi possível carregar o produto.',
                  'Could not load product.',
                ),
          onRetry: () => ref.invalidate(productDetailProvider(productId)),
        ),
        data: (p) => _ProductDetailBody(
          product: p,
          quantity: quantity,
          addAllowed: addAllowed,
          onAdd: () {
            final added = ref
                .read(cartControllerProvider.notifier)
                .addProduct(p);
            if (!added) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    appText(
                      context,
                      'Limite de stock atingido para este produto.',
                      'Stock limit reached for this product.',
                    ),
                  ),
                ),
              );
            }
          },
          onBuyNow: () {
            if (quantity == 0) {
              final added = ref
                  .read(cartControllerProvider.notifier)
                  .addProduct(p);
              if (!added) {
                final errorMessage = ref
                    .read(cartControllerProvider)
                    .errorMessage;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      errorMessage ??
                          appText(
                            context,
                            'Não foi possível adicionar este produto ao carrinho.',
                            'Could not add this product to the cart.',
                          ),
                    ),
                  ),
                );
                return;
              }
            }
            Navigator.of(
              context,
            ).push(MaterialPageRoute<void>(builder: (_) => const CartScreen()));
          },
          onIncrement: () =>
              ref.read(cartControllerProvider.notifier).addProduct(p),
          onDecrement: () => ref
              .read(cartControllerProvider.notifier)
              .updateQuantity(p.id, quantity - 1),
          isFavorite: isFavorite,
          onToggleFavorite: () async {
            final controller = ref.read(favoritesProvider.notifier);
            if (!controller.isAuthenticated) {
              await Navigator.of(context)
                  .push(MaterialPageRoute(builder: (_) => const LoginScreen()));
              return;
            }
            final changed = await controller.toggleFavorite(p);
            if (!changed && context.mounted) {
              final error = ref.read(favoritesProvider).error;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    error?.toString() ??
                        appText(
                          context,
                          'Não foi possível atualizar os favoritos.',
                          'Could not update favorites.',
                        ),
                  ),
                ),
              );
            }
          },
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
    required this.onBuyNow,
    required this.onIncrement,
    required this.onDecrement,
    required this.isFavorite,
    required this.onToggleFavorite,
  });

  final Product product;
  final int quantity;
  final bool addAllowed;
  final VoidCallback onAdd;
  final VoidCallback onBuyNow;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;
  final bool isFavorite;
  final VoidCallback onToggleFavorite;

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
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: scheme.primary,
                  ),
                ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      product.name,
                      style: theme.textTheme.headlineSmall,
                    ),
                  ),
                  IconButton(
                    tooltip: isFavorite
                        ? appText(
                            context,
                            'Remover dos favoritos',
                            'Remove from favorites',
                          )
                        : appText(
                            context,
                            'Adicionar aos favoritos',
                            'Add to favorites',
                          ),
                    onPressed: onToggleFavorite,
                    icon: Icon(
                      isFavorite ? Icons.favorite : Icons.favorite_border,
                    ),
                    color: isFavorite ? Colors.red : null,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.star_rounded, size: 20, color: Colors.amber),
                  const SizedBox(width: 4),
                  Text(
                    product.rating.toStringAsFixed(1),
                    style: theme.textTheme.bodyMedium,
                  ),
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
                product.inStock
                    ? appText(
                        context,
                        'Em stock (${product.stock} disponíveis)',
                        'In stock (${product.stock} available)',
                      )
                    : appText(context, 'Esgotado', 'Out of stock'),
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: product.inStock
                      ? scheme.onSurfaceVariant
                      : scheme.error,
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
                      Text(
                        appText(
                          context,
                          'No carrinho: $quantity',
                          'In cart: $quantity',
                        ),
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: const Color(0xFF1E7A4B),
                        ),
                      ),
                      const Spacer(),
                      IconButton.filledTonal(
                        onPressed: quantity > 0 ? onDecrement : null,
                        icon: const Icon(Icons.remove),
                        constraints: const BoxConstraints.tightFor(
                          width: 36,
                          height: 36,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '$quantity',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton.filledTonal(
                        onPressed: addAllowed ? onIncrement : null,
                        icon: const Icon(Icons.add),
                        constraints: const BoxConstraints.tightFor(
                          width: 36,
                          height: 36,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 20),
              if (product.inStock)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    FilledButton.icon(
                      onPressed: inCart ? null : onAdd,
                      icon: const Icon(Icons.add_shopping_cart),
                      label: Text(
                        inCart
                            ? appText(
                                context,
                                'Adicionado ao carrinho',
                                'Added to cart',
                              )
                            : appText(
                                context,
                                'Adicionar ao carrinho',
                                'Add to cart',
                              ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    OutlinedButton.icon(
                      onPressed: onBuyNow,
                      icon: const Icon(Icons.bolt),
                      label: Text(appText(context, 'Comprar agora', 'Buy now')),
                    ),
                  ],
                )
              else
                FilledButton.icon(
                  onPressed: null,
                  icon: const Icon(Icons.remove_shopping_cart_outlined),
                  label: Text(
                    appText(
                      context,
                      'Produto indisponível',
                      'Product unavailable',
                    ),
                  ),
                ),
              if ((product.description ?? '').isNotEmpty) ...[
                const SizedBox(height: 24),
                Text(
                  appText(context, 'Descrição', 'Description'),
                  style: theme.textTheme.titleMedium,
                ),
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
