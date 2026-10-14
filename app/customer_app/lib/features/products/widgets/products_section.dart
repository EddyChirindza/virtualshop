import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/app_text.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/widgets/error_retry.dart';
import '../models/product.dart';
import '../screens/product_detail_screen.dart';
import 'product_card.dart';

/// Secção da Home: título + lista horizontal de produtos, com estados de
/// loading / erro (com retry) / vazio tratados aqui num só sítio.
class ProductsSection extends StatelessWidget {
  const ProductsSection({
    super.key,
    required this.title,
    required this.products,
    required this.onRetry,
  });

  final String title;
  final AsyncValue<List<Product>> products;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(title, style: Theme.of(context).textTheme.titleLarge),
          ),
        products.when(
          loading: () => const SizedBox(
            height: 180,
            child: Center(child: CircularProgressIndicator()),
          ),
          error: (error, _) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 18),
            child: ErrorRetry(
              message: error is ApiException
                  ? error.message
                  : appText(
                      context,
                      'Não foi possível carregar.',
                      'Could not load products.',
                    ),
              onRetry: onRetry,
            ),
          ),
          data: (items) {
            if (items.isEmpty) {
              return SizedBox(
                height: 100,
                child: Center(
                  child: Text(
                    appText(
                      context,
                      'Ainda não há produtos aqui.',
                      'There are no products here yet.',
                    ),
                  ),
                ),
              );
            }
            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: items.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.68,
                crossAxisSpacing: 14,
                mainAxisSpacing: 14,
              ),
              itemBuilder: (context, index) {
                final product = items[index];
                return ProductCard(
                  product: product,
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) =>
                          ProductDetailScreen(productId: product.id),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ],
    );
  }
}
