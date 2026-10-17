import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/app_text.dart';
import '../../../core/utils/format.dart';
import '../../../theme/app_theme.dart';
import '../../cart/providers/cart_provider.dart';
import '../../favorites/providers/favorites_provider.dart';
import '../../auth/screens/login_screen.dart';
import '../models/product.dart';
import 'product_image.dart';

/// Cartão de produto. Ocupa o espaço que o pai lhe der (tem de ter altura
/// limitada) — usado tanto nas listas horizontais como na grelha.
class ProductCard extends ConsumerWidget {
  const ProductCard({super.key, required this.product, required this.onTap});

  final Product product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartControllerProvider);
    final quantity = cart.getItemByProductId(product.id)?.quantity ?? 0;
    final canAdd = product.inStock && (quantity < product.stock);
    final isFavorite = ref.watch(
      favoritesProvider.select(
        (state) =>
            state.valueOrNull?.any(
              (favorite) => favorite.product.id == product.id,
            ) ??
            false,
      ),
    );

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        boxShadow: AppShadows.product,
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(AppRadius.card),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppRadius.card),
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  height: 120,
                  width: double.infinity,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(AppRadius.image),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        ProductImage(url: product.imageUrl),
                        Positioned(
                          top: 6,
                          right: 6,
                          child: Material(
                            color: AppColors.surface,
                            shape: const CircleBorder(),
                            child: SizedBox(
                              width: 34,
                              height: 34,
                              child: IconButton(
                                padding: EdgeInsets.zero,
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
                                onPressed: () async {
                                  final controller = ref.read(
                                    favoritesProvider.notifier,
                                  );
                                  if (!controller.isAuthenticated) {
                                    await Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (_) => const LoginScreen(),
                                      ),
                                    );
                                    return;
                                  }
                                  final changed = await controller
                                      .toggleFavorite(product);
                                  if (!changed && context.mounted) {
                                    final error = ref
                                        .read(favoritesProvider)
                                        .error;
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          error?.toString() ?? 'Não foi possível atualizar os favoritos.',
                                        ),
                                      ),
                                    );
                                  }
                                },
                                icon: Icon(
                                  isFavorite
                                      ? Icons.favorite_rounded
                                      : Icons.favorite_border_rounded,
                                  size: 19,
                                  color: isFavorite
                                      ? const Color(0xFFB3261E)
                                      : AppColors.ink,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  product.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                const SizedBox(height: 2),
                Text(
                  product.categoryName ??
                      appText(context, 'Produto', 'Product'),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 3),
                Text(
                  switch (product.availability) {
                    'in_stock' => appText(context, 'Em stock', 'In stock'),
                    'low_stock' => appText(context, 'Últimas unidades', 'Low stock'),
                    _ => appText(context, 'Esgotado', 'Out of stock'),
                  },
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: product.availability == 'out_of_stock'
                        ? Theme.of(context).colorScheme.error
                        : product.availability == 'low_stock'
                            ? const Color(0xFFB54708)
                            : const Color(0xFF12805C),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        formatMoney(product.price),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: AppColors.brand,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    if (quantity == 0)
                      SizedBox(
                        width: 34,
                        height: 34,
                        child: IconButton.filled(
                          tooltip: appText(
                            context,
                            'Adicionar ao carrinho',
                            'Add to cart',
                          ),
                          padding: EdgeInsets.zero,
                          style: IconButton.styleFrom(
                            backgroundColor: AppColors.brand,
                            foregroundColor: AppColors.surface,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          onPressed: !canAdd
                              ? null
                              : () => ref
                                    .read(cartControllerProvider.notifier)
                                    .addProduct(product),
                          icon: Icon(
                            product.inStock
                                ? Icons.add_rounded
                                : Icons.remove_rounded,
                            size: 21,
                          ),
                        ),
                      )
                    else
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton.filledTonal(
                            tooltip: appText(
                              context,
                              'Diminuir quantidade',
                              'Decrease quantity',
                            ),
                            onPressed: () => ref
                                .read(cartControllerProvider.notifier)
                                .updateQuantity(product.id, quantity - 1),
                            icon: const Icon(Icons.remove_rounded),
                            constraints: const BoxConstraints.tightFor(
                              width: 30,
                              height: 34,
                            ),
                            padding: EdgeInsets.zero,
                          ),
                          SizedBox(
                            width: 24,
                            child: Text(
                              '$quantity',
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.labelLarge
                                  ?.copyWith(fontWeight: FontWeight.bold),
                            ),
                          ),
                          IconButton.filledTonal(
                            tooltip: appText(
                              context,
                              'Aumentar quantidade',
                              'Increase quantity',
                            ),
                            onPressed: canAdd
                                ? () => ref
                                      .read(cartControllerProvider.notifier)
                                      .addProduct(product)
                                : null,
                            icon: const Icon(Icons.add_rounded),
                            constraints: const BoxConstraints.tightFor(
                              width: 30,
                              height: 34,
                            ),
                            padding: EdgeInsets.zero,
                          ),
                        ],
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
