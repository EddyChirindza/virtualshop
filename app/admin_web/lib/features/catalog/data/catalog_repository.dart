import '../../../core/network/admin_api.dart';
import '../models/admin_product.dart';

class CatalogRepository {
  CatalogRepository({required String token}) : _api = AdminApi(token: token);
  final AdminApi _api;

  Future<AdminProductPage> listProducts({int page = 1, String? search}) async {
    final response = await _api.dio.get('/products', queryParameters: {
      'page': page,
      'limit': 50,
      'sort': 'newest',
      if (search != null && search.trim().isNotEmpty) 'q': search.trim(),
    });
    final body = response.data as Map<String, dynamic>;
    return AdminProductPage(
      items: (body['data'] as List? ?? const [])
          .map((item) => AdminProduct.fromJson(item as Map<String, dynamic>))
          .toList(),
      total: int.tryParse('${body['total']}') ?? 0,
      page: int.tryParse('${body['page']}') ?? page,
      totalPages: int.tryParse('${body['totalPages']}') ?? 1,
    );
  }

  Future<List<AdminCategory>> listCategories() async {
    final response = await _api.dio.get('/categories');
    final body = response.data as Map<String, dynamic>;
    return (body['data'] as List? ?? const [])
        .map((item) => AdminCategory.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<int> createProduct(Map<String, dynamic> fields) async {
    final response = await _api.dio.post('/products', data: fields);
    final body = response.data;
    final data = body is Map && body['data'] is Map ? body['data'] as Map : body;
    final product = data is Map && data['product'] is Map
        ? data['product'] as Map
        : data;
    final id = product is Map ? int.tryParse('${product['id']}') : null;
    if (id == null) {
      throw const FormatException('A API não devolveu o ID do produto criado.');
    }
    return id;
  }

  Future<void> createProductNotification({
    required int productId,
    required String title,
    required String message,
  }) async {
    await _api.dio.post('/admin/notifications', data: {
      'title': title,
      'message': message,
      'type': 'new_product',
      'product_id': productId,
      'status': 'published',
      'idempotency_key': 'product:$productId:new_product',
    });
  }

  Future<void> updateProduct(int id, Map<String, dynamic> fields) async {
    await _api.dio.patch('/products/$id', data: fields);
  }

  Future<void> deleteProduct(int id) async {
    await _api.dio.delete('/products/$id');
  }

  Future<String> uploadProductImage(String base64) async {
    final response = await _api.dio.post('/admin/products/image', data: {'base64': base64});
    final body = response.data as Map<String, dynamic>;
    final data = body['data'] as Map<String, dynamic>;
    return data['image_url'] as String;
  }

  Future<void> createCategory(Map<String, dynamic> fields) async {
    await _api.dio.post('/categories', data: fields);
  }

  Future<void> updateCategory(int id, Map<String, dynamic> fields) async {
    await _api.dio.patch('/categories/$id', data: fields);
  }

  Future<void> deleteCategory(int id) async {
    await _api.dio.delete('/categories/$id');
  }
}
