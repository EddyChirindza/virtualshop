import 'package:customer_app/features/products/models/product.dart';

import '../../../core/utils/format.dart';

class CartItem {
  const CartItem({
    this.id,
    required this.productId,
    required this.product,
    required this.quantity,
    required this.unitPrice,
  });

  final int? id;
  final int productId;
  final Product product;
  final int quantity;
  final double unitPrice;

  double get subtotal => unitPrice * quantity;

  CartItem copyWith({
    int? id,
    int? productId,
    Product? product,
    int? quantity,
    double? unitPrice,
  }) {
    return CartItem(
      id: id ?? this.id,
      productId: productId ?? this.productId,
      product: product ?? this.product,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'name': product.name,
      'imageUrl': product.imageUrl,
      'price': unitPrice,
      'stock': product.stock,
      'rating': product.rating,
      'quantity': quantity,
      'categoryName': product.categoryName,
      'description': product.description,
    };
  }

  factory CartItem.fromJson(Map<String, dynamic> json) {
    final nestedProduct = json['product'] is Map ? Map<String, dynamic>.from(json['product'] as Map) : <String, dynamic>{};
    final productId = parseInt(json['productId'] ?? json['product_id'] ?? nestedProduct['id'] ?? json['id']);
    final merged = {...nestedProduct, ...json};
    final product = Product(
      id: productId,
      name: merged['name'] as String? ?? 'Produto',
      price: parseDouble(merged['price'] ?? merged['unitPrice'] ?? merged['unit_price']),
      stock: parseInt(merged['stock']),
      rating: parseDouble(merged['rating']),
      imageUrl: merged['imageUrl'] as String? ?? merged['image_url'] as String?,
      categoryName: merged['categoryName'] as String? ?? merged['category_name'] as String?,
      description: merged['description'] as String?,
    );

    return CartItem(
      id: parseInt(json['id']) == 0 ? null : parseInt(json['id']),
      productId: productId,
      product: product,
      quantity: parseInt(json['quantity']),
      unitPrice: parseDouble(json['unitPrice'] ?? json['unit_price'] ?? json['price'] ?? merged['price']),
    );
  }

  String get unitPriceLabel => formatMoney(unitPrice);

  String get subtotalLabel => formatMoney(subtotal);
}
