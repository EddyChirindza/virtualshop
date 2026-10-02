import '../../products/models/product.dart';

class Favorite {
  const Favorite({required this.product});

  final Product product;

  factory Favorite.fromJson(Map<String, dynamic> json) {
    final productJson = json['product'] is Map
        ? Map<String, dynamic>.from(json['product'] as Map)
        : json;
    return Favorite(product: Product.fromJson(productJson));
  }
}
