import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../core/storage/secure_storage_service.dart';
import '../models/cart_item.dart';

abstract class CartRepository {
  Future<List<CartItem>> load();
  Future<void> save(List<CartItem> items);
  Future<void> clear();
}

class LocalCartRepository implements CartRepository {
  LocalCartRepository({required SecureStorageService storage})
      : _storage = storage,
        _secureStorage = const FlutterSecureStorage();

  final SecureStorageService _storage;
  final FlutterSecureStorage _secureStorage;

  Future<String> get _cartKey async {
    final token = await _storage.getAccessToken();
    final scope = token != null && token.isNotEmpty ? token.substring(0, token.length > 12 ? 12 : token.length) : 'guest';
    return 'virtualshop_cart_items_$scope';
  }

  @override
  Future<List<CartItem>> load() async {
    final raw = await _secureStorage.read(key: await _cartKey);
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
    await _secureStorage.write(key: await _cartKey, value: payload);
  }

  @override
  Future<void> clear() async {
    await _secureStorage.delete(key: await _cartKey);
  }
}
