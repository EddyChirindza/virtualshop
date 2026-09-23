import 'cart_item.dart';

class CartState {
  const CartState({this.items = const <CartItem>[]});

  final List<CartItem> items;

  bool get isEmpty => items.isEmpty;

  int get itemCount => items.fold<int>(0, (sum, item) => sum + item.quantity);

  double get subtotal => items.fold<double>(0, (sum, item) => sum + item.subtotal);

  double get discount => 0;

  double get deliveryFee => 0;

  double get total => subtotal - discount + deliveryFee;

  List<CartItem> get sortedItems => [...items]
    ..sort((a, b) => a.product.name.toLowerCase().compareTo(b.product.name.toLowerCase()));

  CartItem? getItemByProductId(int productId) {
    for (final item in items) {
      if (item.productId == productId) return item;
    }
    return null;
  }

  CartState copyWith({List<CartItem>? items}) {
    return CartState(items: items ?? this.items);
  }
}
