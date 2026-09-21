import 'package:flutter/material.dart';

import '../../../core/utils/format.dart';
import '../models/product.dart';
import 'product_image.dart';

/// Cartão de produto. Ocupa o espaço que o pai lhe der (tem de ter altura
/// limitada) — usado tanto nas listas horizontais como na grelha.
class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product, required this.onTap});

  final Product product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

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
