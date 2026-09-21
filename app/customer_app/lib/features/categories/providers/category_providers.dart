import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/category_repository.dart';
import '../models/category.dart';

final categoryRepositoryProvider = Provider<CategoryRepository>((ref) {
  return CategoryRepository(dio: ref.watch(dioProvider));
});

/// Categorias de topo (cada uma com as suas subcategorias em `children`).
final categoryTreeProvider = FutureProvider<List<Category>>((ref) {
  return ref.watch(categoryRepositoryProvider).fetchTree();
});
