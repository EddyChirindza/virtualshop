import 'package:admin_web/features/catalog/data/catalog_repository.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../helpers/fake_dio.dart';

void main() {
  group('CatalogRepository.listProducts', () {
    test('envia paginação/pesquisa e lê a página de produtos', () async {
      final fake = FakeAdminApi((request) {
        expect(request.method, 'GET');
        expect(request.path, '/products');
        expect(request.queryParameters['page'], 2);
        expect(request.queryParameters['limit'], 50);
        expect(request.queryParameters['sort'], 'newest');
        expect(request.queryParameters['q'], 'café');
        return jsonResponse({
          'success': true,
          'data': [
            {
              'id': 1,
              'name': 'Café',
              'price': '100.00',
              'stock': 5,
              'rating': '4.5',
              'category_id': 2,
              'category_name': 'Bebidas',
              'stock_status': 'low_stock',
              'is_popular': true,
              'is_new_arrival': false,
            },
          ],
          'page': '2',
          'total': '51',
          'totalPages': '2',
        });
      });

      final page = await CatalogRepository(api: fake.api)
          .listProducts(page: 2, search: '  café  ');

      expect(page.items, hasLength(1));
      expect(page.items.single.name, 'Café');
      expect(page.items.single.availability, 'low_stock');
      expect(page.total, 51);
      expect(page.page, 2);
      expect(page.totalPages, 2);
    });

    test('omite a pesquisa quando está vazia', () async {
      final fake = FakeAdminApi((request) {
        expect(request.queryParameters.containsKey('q'), isFalse);
        return jsonResponse({
          'data': [],
          'page': 1,
          'total': 0,
          'totalPages': 0,
        });
      });

      final page = await CatalogRepository(api: fake.api)
          .listProducts(search: '   ');

      expect(page.items, isEmpty);
      expect(page.total, 0);
    });
  });

  test('listCategories lê a lista devolvida pela API', () async {
    final fake = FakeAdminApi((request) {
      expect(request.method, 'GET');
      expect(request.path, '/categories');
      return jsonResponse({
        'data': [
          {'id': 1, 'name': 'Bebidas', 'slug': 'bebidas'},
        ],
      });
    });

    final categories = await CatalogRepository(api: fake.api).listCategories();

    expect(categories, hasLength(1));
    expect(categories.single.name, 'Bebidas');
    expect(categories.single.parentId, isNull);
  });

  test('createProduct devolve o ID do produto criado', () async {
    final fields = {'name': 'Café', 'price': 100.0};
    final fake = FakeAdminApi((request) {
      expect(request.method, 'POST');
      expect(request.path, '/products');
      expect(request.data, fields);
      return jsonResponse({
        'data': {'id': '99', 'name': 'Café'},
      }, statusCode: 201);
    });

    final id = await CatalogRepository(api: fake.api).createProduct(fields);

    expect(id, 99);
  });

  test('createProduct falha quando a API não devolve ID', () async {
    final fake = FakeAdminApi(
      (_) => jsonResponse({
        'data': {'name': 'Café'},
      }, statusCode: 201),
    );

    expect(
      () => CatalogRepository(api: fake.api).createProduct({'name': 'Café'}),
      throwsA(isA<FormatException>()),
    );
  });

  test('createProductNotification envia o payload idempotente', () async {
    final fake = FakeAdminApi((request) {
      expect(request.method, 'POST');
      expect(request.path, '/admin/notifications');
      expect(request.data, {
        'title': 'Novo produto disponível',
        'message': 'Chegou o café.',
        'type': 'new_product',
        'product_id': 99,
        'status': 'published',
        'idempotency_key': 'product:99:new_product',
      });
      return jsonResponse({'success': true}, statusCode: 201);
    });

    await CatalogRepository(api: fake.api).createProductNotification(
      productId: 99,
      title: 'Novo produto disponível',
      message: 'Chegou o café.',
    );

    expect(fake.requests, hasLength(1));
  });

  test('updateProduct e deleteProduct usam o ID correcto', () async {
    final fake = FakeAdminApi((request) {
      if (request.method == 'PATCH') {
        expect(request.path, '/products/7');
        expect(request.data, {'name': 'Novo nome'});
        return jsonResponse({'success': true});
      }
      expect(request.method, 'DELETE');
      expect(request.path, '/products/7');
      return jsonResponse({'success': true});
    });
    final repository = CatalogRepository(api: fake.api);

    await repository.updateProduct(7, {'name': 'Novo nome'});
    await repository.deleteProduct(7);

    expect(fake.requests.map((request) => request.method), ['PATCH', 'DELETE']);
  });

  test('uploadProductImage envia base64 e devolve o URL', () async {
    final fake = FakeAdminApi((request) {
      expect(request.method, 'POST');
      expect(request.path, '/admin/products/image');
      expect(request.data, {'base64': 'aW1hZ2Vt'});
      return jsonResponse({
        'data': {'image_url': '/uploads/products/a.png'},
      }, statusCode: 201);
    });

    final url = await CatalogRepository(api: fake.api)
        .uploadProductImage('aW1hZ2Vt');

    expect(url, '/uploads/products/a.png');
  });

  test(
    'createCategory, updateCategory e deleteCategory usam os endpoints',
    () async {
      final fake = FakeAdminApi((request) {
        if (request.method == 'POST') {
          expect(request.path, '/categories');
          expect(request.data, {'name': 'Bebidas', 'slug': 'bebidas'});
          return jsonResponse({'success': true}, statusCode: 201);
        }
        if (request.method == 'PATCH') {
          expect(request.path, '/categories/3');
          expect(request.data, {'name': 'Bebidas frias'});
          return jsonResponse({'success': true});
        }
        expect(request.method, 'DELETE');
        expect(request.path, '/categories/3');
        return jsonResponse({'success': true});
      });
      final repository = CatalogRepository(api: fake.api);

      await repository.createCategory({'name': 'Bebidas', 'slug': 'bebidas'});
      await repository.updateCategory(3, {'name': 'Bebidas frias'});
      await repository.deleteCategory(3);

      expect(fake.requests, hasLength(3));
    },
  );
}
