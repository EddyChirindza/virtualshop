import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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

  static const double _height = 250;
  static const double _cardWidth = 160;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
          child: Text(title, style: Theme.of(context).textTheme.titleLarge),
        ),
        SizedBox(
          height: _height,
          child: products.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => ErrorRetry(
              message: error is ApiException ? error.message : 'Não foi possível carregar.',
              onRetry: onRetry,
            ),
            data: (items) {
              if (items.isEmpty) {
                return const Center(child: Text('Ainda não há produtos aqui.'));
              }
              return ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: items.length,
                separatorBuilder: (context, index) => const SizedBox(width: 12),
                itemBuilder: (context, index) {
                  final product = items[index];
                  return SizedBox(
                    width: _cardWidth,
                    child: ProductCard(
                      product: product,
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ProductDetailScreen(productId: product.id),
                        ),
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}
