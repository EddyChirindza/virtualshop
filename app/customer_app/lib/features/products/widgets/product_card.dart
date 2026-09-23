import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/format.dart';
import '../../cart/providers/cart_provider.dart';
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
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final cart = ref.watch(cartControllerProvider);
    final item = cart.getItemByProductId(product.id);
    final inCart = item != null;
    final quantity = item?.quantity ?? 0;
    final canAdd = product.inStock && (quantity < product.stock);

    return Card(
      clipBehavior: Clip.antiAlias,
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: ProductImage(url: product.imageUrl)),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.star_rounded, size: 16, color: Colors.amber),
                      const SizedBox(width: 2),
                      Text(product.rating.toStringAsFixed(1),
                          style: theme.textTheme.labelSmall),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    formatMoney(product.price),
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: scheme.primary,
                    ),
                  ),
                  if (!product.inStock)
                    Text(
                      'Esgotado',
                      style: theme.textTheme.labelSmall?.copyWith(color: scheme.error),
                    )
                  else if (inCart)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECF7ED),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          'No carrinho: $quantity',
                          style: theme.textTheme.labelSmall?.copyWith(color: const Color(0xFF1E7A4B)),
                        ),
                      ),
                    ),
                  const SizedBox(height: 8),
                  if (product.inStock)
                    if (inCart)
                      Row(
                        children: [
                          IconButton.filledTonal(
                            onPressed: () => ref.read(cartControllerProvider.notifier).updateQuantity(product.id, quantity - 1),
                            icon: const Icon(Icons.remove),
                            constraints: const BoxConstraints.tightFor(width: 30, height: 30),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            child: Text('$quantity', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                          ),
                          IconButton.filledTonal(
                            onPressed: canAdd ? () => ref.read(cartControllerProvider.notifier).addProduct(product) : null,
                            icon: const Icon(Icons.add),
                            constraints: const BoxConstraints.tightFor(width: 30, height: 30),
                          ),
                        ],
                      )
                    else
                      FilledButton.icon(
                        onPressed: () {
                          final added = ref.read(cartControllerProvider.notifier).addProduct(product);
                          if (!added) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Limite de stock atingido para este produto.')),
                            );
                          }
                        },
                        icon: const Icon(Icons.add_shopping_cart_outlined),
                        label: const Text('Adicionar'),
                      )
                  else
                    FilledButton.icon(
                      onPressed: null,
                      icon: const Icon(Icons.remove_shopping_cart_outlined),
                      label: const Text('Indisponível'),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
