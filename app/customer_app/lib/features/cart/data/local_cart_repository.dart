import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/cart_item.dart';

abstract class CartRepository {
  Future<List<CartItem>> load();
  Future<void> save(List<CartItem> items);
  Future<void> clear();
}

class LocalCartRepository implements CartRepository {
  LocalCartRepository({this.userId})
    : _secureStorage = const FlutterSecureStorage();

  static const _keyPrefix = 'virtualshop_cart_items';

  final int? userId;
  final FlutterSecureStorage _secureStorage;

  String get _cartKey {
    final id = userId;
    final scope = id != null && id > 0 ? 'user_$id' : 'guest';
    return '${_keyPrefix}_$scope';
  }

  @override
  Future<List<CartItem>> load() async {
    final raw = await _secureStorage.read(key: _cartKey);
    if (raw == null || raw.isEmpty) return const [];

    final decoded = jsonDecode(raw);
    if (decoded is! List) return const [];

    return decoded
        .whereType<Map<String, dynamic>>()
        .map((item) => CartItem.fromJson(item))
        .toList();
  }

  @override
  Future<void> save(List<CartItem> items) async {
    final payload = jsonEncode(items.map((item) => item.toJson()).toList());
    await _secureStorage.write(key: _cartKey, value: payload);
  }

  @override
  Future<void> clear() async {
    await _secureStorage.delete(key: _cartKey);
  }
}
