import '../../../core/utils/format.dart';

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.price,
    required this.stock,
    required this.rating,
    this.description,
    this.imageUrl,
    this.categoryName,
    this.isPopular = false,
    this.isNewArrival = false,
  });

  final int id;
  final String name;
  final String? description;
  final double price;
  final int stock;
  final double rating;
  final String? imageUrl;
  final String? categoryName;
  final bool isPopular;
  final bool isNewArrival;

  bool get inStock => stock > 0;

  /// A API devolve `price` e `rating` como TEXTO ("150.00", "4.5") porque o
  /// PostgreSQL serializa NUMERIC assim — parseDouble aceita texto ou número.
  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: parseInt(json['id']),
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      price: parseDouble(json['price']),
      stock: parseInt(json['stock']),
      rating: parseDouble(json['rating']),
      imageUrl: json['image_url'] as String?,
      categoryName: json['category_name'] as String?,
      isPopular: json['is_popular'] as bool? ?? false,
      isNewArrival: json['is_new_arrival'] as bool? ?? false,
    );
  }
}
