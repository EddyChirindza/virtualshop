import '../../../products/models/product.dart';

class ProductSearchResult {
  const ProductSearchResult({
    required this.products,
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  final List<Product> products;
  final int page;
  final int limit;
  final int total;
  final int totalPages;
}
