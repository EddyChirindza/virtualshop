import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/session/session_controller.dart';
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
  int _generation = 0;
  int _buildId = 0;
  late SessionController _sessionController;

  @override
  CartState build() {
    final authState = ref.watch(authControllerProvider);
    final session = ref.watch(sessionControllerProvider);
    _sessionController = ref.read(sessionControllerProvider.notifier);
    _generation = session.generation;
    final buildId = ++_buildId;
    _isAuthenticated = authState.valueOrNull != null;
    _guestBlocked = authState.hasValue && !_isAuthenticated;
    _repository = _isAuthenticated
        ? ref.read(remoteCartRepositoryProvider)
        : ref.read(localCartRepositoryProvider);
    _loadFromStorage(generation: _generation, buildId: buildId);
    return CartState(
      errorMessage: _guestBlocked
          ? 'Inicia sessão para usar o carrinho.'
          : null,
      isLoading: !_guestBlocked,
    );
  }

  Future<void> _loadFromStorage({
    required int generation,
    required int buildId,
  }) async {
    if (_guestBlocked) return;
    final repository = _repository;
    try {
      if (repository is RemoteCartRepository) {
        final loaded = await repository.loadState();
        if (!_isCurrent(generation, buildId)) return;
        state = loaded;
      } else {
        final items = await repository.load();
        if (!_isCurrent(generation, buildId)) return;
        state = CartState(items: items);
      }
    } on ApiException catch (error) {
      if (!_isCurrent(generation, buildId)) return;
      state = state.copyWith(
        isLoading: false,
        errorMessage: _messageFor(error),
      );
    } catch (_) {
      if (!_isCurrent(generation, buildId)) return;
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Não foi possível carregar o carrinho.',
      );
    }
  }

  bool _isCurrent(int generation, int buildId) =>
      buildId == _buildId && _sessionController.isCurrent(generation);

  Future<void> _persist(CartRepository repository) async {
    await repository.save(state.items);
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
        generation: _generation,
        buildId: _buildId,
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
      unawaited(
        _syncRemove(
          generation: _generation,
          buildId: _buildId,
          previous: previous,
          item: removed,
        ),
      );
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
    unawaited(
      _syncUpdate(
        generation: _generation,
        buildId: _buildId,
        previous: previous,
        item: items[index],
      ),
    );
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
    unawaited(
      _syncRemove(
        generation: _generation,
        buildId: _buildId,
        previous: previous,
        item: removed,
      ),
    );
  }

  void clearCart() {
    if (!_canUseCart()) return;
    final previous = state;
    state = const CartState(isUpdating: true);
    unawaited(
      _syncClear(
        generation: _generation,
        buildId: _buildId,
        previous: previous,
      ),
    );
  }

  Future<bool> checkout({
    int? deliveryAddressId,
    int? paymentMethodId,
    String? deliveryMethod,
    String? couponCode,
    String? notes,
  }) async {
    if (!_canUseCart() || state.isEmpty) return false;
    final generation = _generation;
    final buildId = _buildId;
    final repository = _repository;
    final localRepository = ref.read(localCartRepositoryProvider);
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
      if (!_isCurrent(generation, buildId)) return true;
      await localRepository.clear();
      if (!_isCurrent(generation, buildId)) return true;
      state = const CartState();
      return true;
    } on ApiException catch (error) {
      if (!_isCurrent(generation, buildId)) return false;
      state = state.copyWith(
        isUpdating: false,
        errorMessage: _messageFor(error),
      );
      return false;
    }
  }

  Future<void> _syncAdd({
    required int generation,
    required int buildId,
    required CartState previous,
    required CartItem item,
    required bool wasExisting,
  }) async {
    if (!_isCurrent(generation, buildId)) return;
    final repository = _repository;
    try {
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
        await _persist(repository);
        if (!_isCurrent(generation, buildId)) return;
        state = state.copyWith(isUpdating: false);
      }
      await _reloadRemote(
        generation: generation,
        buildId: buildId,
        repository: repository,
      );
    } catch (error) {
      if (!_isCurrent(generation, buildId)) return;
      _restoreAfterError(previous, error);
    }
  }

  Future<void> _syncUpdate({
    required int generation,
    required int buildId,
    required CartState previous,
    required CartItem item,
  }) async {
    if (!_isCurrent(generation, buildId)) return;
    final repository = _repository;
    try {
      if (repository is RemoteCartRepository) {
        if (item.id == null) throw StateError('Missing remote cart item id');
        await repository.updateItem(itemId: item.id!, quantity: item.quantity);
      } else {
        await _persist(repository);
        if (!_isCurrent(generation, buildId)) return;
        state = state.copyWith(isUpdating: false);
      }
      await _reloadRemote(
        generation: generation,
        buildId: buildId,
        repository: repository,
      );
    } catch (error) {
      if (!_isCurrent(generation, buildId)) return;
      _restoreAfterError(previous, error);
    }
  }

  Future<void> _syncRemove({
    required int generation,
    required int buildId,
    required CartState previous,
    required CartItem item,
  }) async {
    if (!_isCurrent(generation, buildId)) return;
    final repository = _repository;
    try {
      if (repository is RemoteCartRepository && item.id != null) {
        await repository.removeItem(itemId: item.id!);
        await _reloadRemote(
          generation: generation,
          buildId: buildId,
          repository: repository,
        );
      } else {
        await _persist(repository);
        if (!_isCurrent(generation, buildId)) return;
        state = state.copyWith(isUpdating: false);
      }
    } catch (error) {
      if (!_isCurrent(generation, buildId)) return;
      _restoreAfterError(previous, error);
    }
  }

  Future<void> _syncClear({
    required int generation,
    required int buildId,
    required CartState previous,
  }) async {
    if (!_isCurrent(generation, buildId)) return;
    final repository = _repository;
    try {
      await repository.clear();
      if (!_isCurrent(generation, buildId)) return;
      state = const CartState();
    } catch (error) {
      if (!_isCurrent(generation, buildId)) return;
      _restoreAfterError(previous, error);
    }
  }

  Future<void> _reloadRemote({
    required int generation,
    required int buildId,
    required CartRepository repository,
  }) async {
    if (repository is RemoteCartRepository) {
      final loaded = await repository.loadState();
      if (!_isCurrent(generation, buildId)) return;
      state = loaded;
    } else {
      if (!_isCurrent(generation, buildId)) return;
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
