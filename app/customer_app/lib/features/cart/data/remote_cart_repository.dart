import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/utils/format.dart';
import '../models/cart_item.dart';
import '../models/cart_state.dart';
import 'local_cart_repository.dart';

class RemoteCartRepository implements CartRepository {
  RemoteCartRepository({required this._dio});

  final Dio _dio;

  @override
  Future<List<CartItem>> load() async => (await loadState()).items;

  Future<CartState> loadState() async {
    try {
      final response = await _dio.get(ApiConstants.cart);
      return _stateFromResponse(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<void> addProduct({required int productId, required int quantity}) async {
    await _request(() => _dio.post(ApiConstants.cartItems, data: {
          'productId': productId,
          'quantity': quantity,
        }));
  }

  Future<void> updateItem({required int itemId, required int quantity}) async {
    await _request(() => _dio.patch('${ApiConstants.cartItems}/$itemId', data: {'quantity': quantity}));
  }

  Future<void> removeItem({required int itemId}) async {
    await _request(() => _dio.delete('${ApiConstants.cartItems}/$itemId'));
  }

  Future<void> checkout() async {
    await _request(() => _dio.post(ApiConstants.orders));
  }

  @override
  Future<void> save(List<CartItem> items) async {
    // The controller uses the item-specific API methods for remote changes.
  }

  @override
  Future<void> clear() async {
    await _request(() => _dio.delete(ApiConstants.cart));
  }

  Future<void> _request(Future<Response<dynamic>> Function() request) async {
    try {
      await request();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  CartState _stateFromResponse(dynamic body) {
    final root = body is Map ? Map<String, dynamic>.from(body) : <String, dynamic>{};
    final data = root['data'] is Map ? Map<String, dynamic>.from(root['data'] as Map) : root;
    final rawItems = data['items'] is List ? data['items'] as List : const [];
    return CartState(
      items: rawItems.whereType<Map>().map((item) => CartItem.fromJson(Map<String, dynamic>.from(item))).toList(),
      discount: parseDouble(data['discount']),
      deliveryFee: parseDouble(data['deliveryFee'] ?? data['delivery_fee']),
    );
  }
}