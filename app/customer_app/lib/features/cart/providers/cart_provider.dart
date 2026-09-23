import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../products/models/product.dart';
import '../data/local_cart_repository.dart';
import '../models/cart_item.dart';
import '../models/cart_state.dart';

final localCartRepositoryProvider = Provider<CartRepository>((ref) {
  return LocalCartRepository(storage: ref.watch(secureStorageProvider));
});

final cartControllerProvider = NotifierProvider<CartController, CartState>(CartController.new);

class CartController extends Notifier<CartState> {
  late final CartRepository _repository;

  @override
  CartState build() {
    _repository = ref.read(localCartRepositoryProvider);
    _loadFromStorage();
    return const CartState();
  }

  Future<void> _loadFromStorage() async {
    final items = await _repository.load();
    state = CartState(items: items);
  }

  Future<void> _persist() async {
    await _repository.save(state.items);
  }

  CartItem? getItemByProductId(int productId) {
    for (final item in state.items) {
      if (item.productId == productId) return item;
    }
    return null;
  }

  bool addProduct(Product product) {
    if (!product.inStock) return false;

    final items = [...state.items];
    final index = items.indexWhere((item) => item.productId == product.id);

    if (index >= 0) {
      final current = items[index];
      final nextQuantity = current.quantity + 1;
      if (nextQuantity > product.stock) return false;

      items[index] = current.copyWith(
        quantity: nextQuantity,
        product: product,
        unitPrice: product.price,
      );
    } else {
      items.add(
        CartItem(
          productId: product.id,
          product: product,
          quantity: 1,
          unitPrice: product.price,
        ),
      );
    }

    state = CartState(items: items);
    unawaited(_persist());
    return true;
  }

  void updateQuantity(int productId, int quantity) {
    final items = [...state.items];
    final index = items.indexWhere((item) => item.productId == productId);
    if (index < 0) return;

    final item = items[index];
    final product = item.product;

    if (quantity <= 0) {
      items.removeAt(index);
      state = CartState(items: items);
      unawaited(_persist());
      return;
    }

    if (product.stock > 0 && quantity > product.stock) return;

    items[index] = item.copyWith(quantity: quantity, product: product, unitPrice: product.price);
    state = CartState(items: items);
    unawaited(_persist());
  }

  void removeProduct(int productId) {
    final items = [...state.items];
    final index = items.indexWhere((item) => item.productId == productId);
    if (index < 0) return;

    items.removeAt(index);
    state = CartState(items: items);
    unawaited(_persist());
  }

  void clearCart() {
    state = const CartState();
    unawaited(_repository.clear());
  }
}
