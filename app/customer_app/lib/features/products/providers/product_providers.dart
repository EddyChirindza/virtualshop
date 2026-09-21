import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/product_repository.dart';
import '../models/product.dart';

final productRepositoryProvider = Provider<ProductRepository>((ref) {
  return ProductRepository(dio: ref.watch(dioProvider));
});

final popularProductsProvider = FutureProvider<List<Product>>((ref) {
  return ref.watch(productRepositoryProvider).fetchPopular();
});

final newArrivalsProvider = FutureProvider<List<Product>>((ref) {
  return ref.watch(productRepositoryProvider).fetchNewArrivals();
});

final productDetailProvider = FutureProvider.family<Product, int>((ref, id) {
  return ref.watch(productRepositoryProvider).fetchById(id);
});

final productsByCategoryProvider =
    FutureProvider.family<List<Product>, int>((ref, categoryId) {
  return ref.watch(productRepositoryProvider).fetchByCategory(categoryId);
});
