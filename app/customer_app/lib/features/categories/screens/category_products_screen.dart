import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/widgets/error_retry.dart';
import '../../products/providers/product_providers.dart';
import '../../products/screens/product_detail_screen.dart';
import '../../products/widgets/product_card.dart';
import '../models/category.dart';

/// Produtos de uma categoria. Se a categoria tiver subcategorias, mostra
/// chips para filtrar ("Tudo" + cada subcategoria).
class CategoryProductsScreen extends ConsumerStatefulWidget {
  const CategoryProductsScreen({super.key, required this.category});

  final Category category;

  @override
  ConsumerState<CategoryProductsScreen> createState() => _CategoryProductsScreenState();
}

class _CategoryProductsScreenState extends ConsumerState<CategoryProductsScreen> {
  late int _selectedId = widget.category.id;

  @override
  Widget build(BuildContext context) {
    final category = widget.category;
    final products = ref.watch(productsByCategoryProvider(_selectedId));

    return Scaffold(
      appBar: AppBar(title: Text(category.name)),
      body: Column(
        children: [
          if (category.hasChildren)
            SizedBox(
              height: 56,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                children: [
                  _chip('Tudo', category.id),
                  for (final child in category.children) _chip(child.name, child.id),
                ],
              ),
            ),
          Expanded(
            child: products.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => ErrorRetry(
                message: error is ApiException ? error.message : 'Não foi possível carregar os produtos.',
                onRetry: () => ref.invalidate(productsByCategoryProvider(_selectedId)),
              ),
              data: (items) {
                if (items.isEmpty) {
                  return const Center(child: Text('Sem produtos nesta categoria.'));
                }
                return GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 200,
                    childAspectRatio: 0.7,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: items.length,
                  itemBuilder: (context, index) {
                    final product = items[index];
                    return ProductCard(
                      product: product,
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ProductDetailScreen(productId: product.id),
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _chip(String label, int id) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: _selectedId == id,
        onSelected: (_) => setState(() => _selectedId = id),
      ),
    );
  }
}
