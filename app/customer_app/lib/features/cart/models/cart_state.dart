import 'cart_item.dart';

class CartState {
  const CartState({
    this.items = const <CartItem>[],
    this.discount = 0,
    this.deliveryFee = 0,
    this.isLoading = false,
    this.isUpdating = false,
    this.errorMessage,
  });

  final List<CartItem> items;
  final double discount;
  final double deliveryFee;
  final bool isLoading;
  final bool isUpdating;
  final String? errorMessage;

  bool get isEmpty => items.isEmpty;

  int get itemCount => items.fold<int>(0, (sum, item) => sum + item.quantity);

  double get subtotal => items.fold<double>(0, (sum, item) => sum + item.subtotal);

  double get total => subtotal - discount + deliveryFee;

  List<CartItem> get sortedItems => [...items]
    ..sort((a, b) => a.product.name.toLowerCase().compareTo(b.product.name.toLowerCase()));

  CartItem? getItemByProductId(int productId) {
    for (final item in items) {
      if (item.productId == productId) return item;
    }
    return null;
  }

  CartState copyWith({
    List<CartItem>? items,
    double? discount,
    double? deliveryFee,
    bool? isLoading,
    bool? isUpdating,
    String? errorMessage,
    bool clearError = false,
  }) {
    return CartState(
      items: items ?? this.items,
      discount: discount ?? this.discount,
      deliveryFee: deliveryFee ?? this.deliveryFee,
      isLoading: isLoading ?? this.isLoading,
      isUpdating: isUpdating ?? this.isUpdating,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}
