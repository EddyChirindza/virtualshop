import 'package:customer_app/features/products/models/product.dart';

import '../../../core/utils/format.dart';

class CartItem {
  const CartItem({
    required this.productId,
    required this.product,
    required this.quantity,
    required this.unitPrice,
  });

  final int productId;
  final Product product;
  final int quantity;
  final double unitPrice;

  double get subtotal => unitPrice * quantity;

  CartItem copyWith({
    int? productId,
    Product? product,
    int? quantity,
    double? unitPrice,
  }) {
    return CartItem(
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
    final productId = parseInt(json['productId'] ?? json['id']);
    final product = Product(
      id: productId,
      name: json['name'] as String? ?? 'Produto',
      price: parseDouble(json['price']),
      stock: parseInt(json['stock']),
      rating: parseDouble(json['rating']),
      imageUrl: json['imageUrl'] as String?,
      categoryName: json['categoryName'] as String?,
      description: json['description'] as String?,
    );

    return CartItem(
      productId: productId,
      product: product,
      quantity: parseInt(json['quantity']),
      unitPrice: parseDouble(json['price']),
    );
  }

  String get unitPriceLabel => formatMoney(unitPrice);

  String get subtotalLabel => formatMoney(subtotal);
}
