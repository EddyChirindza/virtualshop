import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../core/errors/api_exception.dart';
import '../../auth/providers/auth_providers.dart';
import '../../products/models/product.dart';
import '../data/local_cart_repository.dart';
import '../data/remote_cart_repository.dart';
import '../models/cart_item.dart';
import '../models/cart_state.dart';

final localCartRepositoryProvider = Provider<CartRepository>((ref) {
  final user = ref.watch(authControllerProvider).valueOrNull;
  return LocalCartRepository(userId: user?.id);
});

final remoteCartRepositoryProvider = Provider<RemoteCartRepository>((ref) {
  return RemoteCartRepository(dio: ref.watch(dioProvider));
});

final cartControllerProvider = NotifierProvider<CartController, CartState>(
  CartController.new,
);

class CartController extends Notifier<CartState> {
  late CartRepository _repository;
  bool _isAuthenticated = false;
  bool _guestBlocked = false;

  @override
  CartState build() {
    final authState = ref.watch(authControllerProvider);
    _isAuthenticated = authState.valueOrNull != null;
    _guestBlocked = authState.hasValue && !_isAuthenticated;
    _repository = _isAuthenticated
        ? ref.read(remoteCartRepositoryProvider)
        : ref.read(localCartRepositoryProvider);
    _loadFromStorage();
    return CartState(
      errorMessage: _guestBlocked
          ? 'Inicia sessão para usar o carrinho.'
          : null,
      isLoading: !_guestBlocked,
    );
  }

  Future<void> _loadFromStorage() async {
    if (_guestBlocked) return;
    try {
      final repository = _repository;
      if (repository is RemoteCartRepository) {
        state = await repository.loadState();
      } else {
        final items = await repository.load();
        state = CartState(items: items);
      }
    } on ApiException catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _messageFor(error),
      );
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Não foi possível carregar o carrinho.',
      );
    }
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

  String? get errorMessage => state.errorMessage;

  bool _canUseCart() {
    if (_guestBlocked) {
      state = state.copyWith(
        errorMessage: 'Inicia sessão para usar o carrinho.',
      );
      return false;
    }
    return true;
  }

  bool addProduct(Product product) {
    if (!_canUseCart()) return false;
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

    final previous = state;
    state = state.copyWith(
      items: items,
      isLoading: false,
      isUpdating: true,
      clearError: true,
    );
    unawaited(
      _syncAdd(
        previous: previous,
        item: items[index >= 0 ? index : items.length - 1],
        wasExisting: index >= 0,
      ),
    );
    return true;
  }

  void updateQuantity(int productId, int quantity) {
    if (!_canUseCart()) return;
    final items = [...state.items];
    final index = items.indexWhere((item) => item.productId == productId);
    if (index < 0) return;

    final item = items[index];
    final product = item.product;

    if (quantity <= 0) {
      final previous = state;
      final removed = items[index];
      items.removeAt(index);
      state = state.copyWith(items: items, isUpdating: true, clearError: true);
      unawaited(_syncRemove(previous: previous, item: removed));
      return;
    }

    if (product.stock > 0 && quantity > product.stock) return;

    items[index] = item.copyWith(
      quantity: quantity,
      product: product,
      unitPrice: product.price,
    );
    final previous = state;
    state = state.copyWith(items: items, isUpdating: true, clearError: true);
    unawaited(_syncUpdate(previous: previous, item: items[index]));
  }

  void removeProduct(int productId) {
    if (!_canUseCart()) return;
    final items = [...state.items];
    final index = items.indexWhere((item) => item.productId == productId);
    if (index < 0) return;

    items.removeAt(index);
    final previous = state;
    final removed = state.items[index];
    state = state.copyWith(items: items, isUpdating: true, clearError: true);
    unawaited(_syncRemove(previous: previous, item: removed));
  }

  void clearCart() {
    if (!_canUseCart()) return;
    final previous = state;
    state = const CartState(isUpdating: true);
    unawaited(_syncClear(previous));
  }

  Future<bool> checkout({
    int? deliveryAddressId,
    int? paymentMethodId,
    String? deliveryMethod,
    String? couponCode,
    String? notes,
  }) async {
    if (!_canUseCart() || state.isEmpty) return false;
    final repository = _repository;
    if (repository is! RemoteCartRepository) return false;

    state = state.copyWith(isUpdating: true, clearError: true);
    try {
      await repository.checkout(
        deliveryAddressId: deliveryAddressId,
        paymentMethodId: paymentMethodId,
        deliveryMethod: deliveryMethod,
        couponCode: couponCode,
        notes: notes,
      );
      await ref.read(localCartRepositoryProvider).clear();
      state = const CartState();
      return true;
    } on ApiException catch (error) {
      state = state.copyWith(
        isUpdating: false,
        errorMessage: _messageFor(error),
      );
      return false;
    }
  }

  Future<void> _syncAdd({
    required CartState previous,
    required CartItem item,
    required bool wasExisting,
  }) async {
    try {
      final repository = _repository;
      if (repository is RemoteCartRepository) {
        if (wasExisting && item.id != null) {
          await repository.updateItem(
            itemId: item.id!,
            quantity: item.quantity,
          );
        } else {
          await repository.addProduct(
            productId: item.productId,
            quantity: wasExisting ? item.quantity : 1,
          );
        }
      } else {
        await _persist();
        state = state.copyWith(isUpdating: false);
      }
      await _reloadRemote();
    } catch (error) {
      _restoreAfterError(previous, error);
    }
  }

  Future<void> _syncUpdate({
    required CartState previous,
    required CartItem item,
  }) async {
    try {
      final repository = _repository;
      if (repository is RemoteCartRepository) {
        if (item.id == null) throw StateError('Missing remote cart item id');
        await repository.updateItem(itemId: item.id!, quantity: item.quantity);
      } else {
        await _persist();
        state = state.copyWith(isUpdating: false);
      }
      await _reloadRemote();
    } catch (error) {
      _restoreAfterError(previous, error);
    }
  }

  Future<void> _syncRemove({
    required CartState previous,
    required CartItem item,
  }) async {
    try {
      final repository = _repository;
      if (repository is RemoteCartRepository && item.id != null) {
        await repository.removeItem(itemId: item.id!);
        await _reloadRemote();
      } else {
        await _persist();
        state = state.copyWith(isUpdating: false);
      }
    } catch (error) {
      _restoreAfterError(previous, error);
    }
  }

  Future<void> _syncClear(CartState previous) async {
    try {
      await _repository.clear();
      state = const CartState();
    } catch (error) {
      _restoreAfterError(previous, error);
    }
  }

  Future<void> _reloadRemote() async {
    final repository = _repository;
    if (repository is RemoteCartRepository) {
      state = await repository.loadState();
    } else {
      state = state.copyWith(isUpdating: false);
    }
  }

  void _restoreAfterError(CartState previous, Object error) {
    final message = error is ApiException
        ? _messageFor(error)
        : 'Não foi possível atualizar o carrinho.';
    state = previous.copyWith(
      isLoading: false,
      isUpdating: false,
      errorMessage: message,
    );
  }

  String _messageFor(ApiException error) {
    if (error.statusCode == 409) return 'Stock insuficiente para este produto.';
    if (error.statusCode == 401)
      return 'Sessão expirada. Inicia sessão novamente.';
    return error.message;
  }
}
