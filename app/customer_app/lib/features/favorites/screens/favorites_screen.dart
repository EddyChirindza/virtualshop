import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/app_text.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/widgets/error_retry.dart';
import '../../products/screens/product_detail_screen.dart';
import '../../products/widgets/product_card.dart';
import '../providers/favorites_provider.dart';

class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favorites = ref.watch(favoritesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Favoritos')),
      body: favorites.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorRetry(
          message: error is ApiException
              ? error.message
              : appText(
                  context,
                  'Não foi possível carregar os favoritos.',
                  'Could not load favorites.',
                ),
          onRetry: () => ref.read(favoritesProvider.notifier).reload(),
        ),
        data: (items) {
          if (items.isEmpty) {
            return Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  appText(
                    context,
                    'Ainda não tens produtos favoritos.',
                    'You do not have any favorite products yet.',
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () => ref.read(favoritesProvider.notifier).reload(),
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              physics: const AlwaysScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.62,
              ),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final product = items[index].product;
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
            ),
          );
        },
      ),
    );
  }
}
