import 'package:admin_web/features/catalog/models/admin_product.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AdminProduct.fromJson', () {
    test('lê os campos principais', () {
      final product = AdminProduct.fromJson({
        'id': 12,
        'name': 'Café',
        'description': 'Descrição',
        'price': '125.50',
        'stock': '3',
        'rating': '4.5',
        'image_url': '/uploads/products/cafe.jpg',
        'image_urls': [
          '/uploads/products/cafe.jpg',
          '/uploads/products/cafe-2.jpg',
        ],
        'category_id': '2',
        'category_name': 'Bebidas',
        'stock_status': 'low_stock',
        'is_popular': true,
        'is_new_arrival': true,
      });

      expect(product.id, 12);
      expect(product.name, 'Café');
      expect(product.description, 'Descrição');
      expect(product.price, 125.5);
      expect(product.stock, 3);
      expect(product.rating, 4.5);
      expect(product.imageUrl, '/uploads/products/cafe.jpg');
      expect(product.imageUrls, hasLength(2));
      expect(product.categoryId, 2);
      expect(product.categoryName, 'Bebidas');
      expect(product.availability, 'low_stock');
      expect(product.isPopular, isTrue);
      expect(product.isNewArrival, isTrue);
    });

    test('ignora URLs vazias em image_urls', () {
      final product = AdminProduct.fromJson({
        'id': '7',
        'name': 'Produto',
        'image_url': '/uploads/products/a.png',
        'image_urls': ['', '/uploads/products/b.png'],
      });

      expect(product.imageUrls, ['/uploads/products/b.png']);
      expect(product.imageUrl, '/uploads/products/a.png');
    });

    test('usa image_url como fallback quando image_urls está vazio', () {
      final product = AdminProduct.fromJson({
        'image_url': '/uploads/products/a.png',
        'image_urls': <String>[],
      });

      expect(product.imageUrls, ['/uploads/products/a.png']);
    });

    test('tolera valores ausentes e inválidos', () {
      final product = AdminProduct.fromJson({
        'id': 'not-a-number',
        'price': 'not-a-number',
      });

      expect(product.id, 0);
      expect(product.name, '');
      expect(product.price, 0);
      expect(product.stock, 0);
      expect(product.rating, 0);
      expect(product.imageUrls, isEmpty);
      expect(product.categoryId, isNull);
      expect(product.categoryName, isNull);
      expect(product.isPopular, isFalse);
      expect(product.isNewArrival, isFalse);
    });
  });

  group('AdminProduct.availability', () {
    test('usa stockStatus quando está presente', () {
      expect(
        _product(stock: 0, stockStatus: 'in_stock').availability,
        'in_stock',
      );
    });

    test('deriva a disponibilidade do stock quando stockStatus não existe', () {
      expect(_product(stock: 0).availability, 'out_of_stock');
      expect(_product(stock: 5).availability, 'low_stock');
      expect(_product(stock: 6).availability, 'in_stock');
    });
  });

  group('AdminCategory.fromJson', () {
    test('lê os dados da categoria e da categoria principal', () {
      final category = AdminCategory.fromJson({
        'id': '5',
        'name': 'Refrigerantes',
        'slug': 'refrigerantes',
        'icon_url': '/uploads/icons/drinks.png',
        'parent_id': '2',
      });

      expect(category.id, 5);
      expect(category.name, 'Refrigerantes');
      expect(category.slug, 'refrigerantes');
      expect(category.iconUrl, '/uploads/icons/drinks.png');
      expect(category.parentId, 2);
    });

    test('tolera uma categoria principal nula', () {
      final category = AdminCategory.fromJson({
        'id': 2,
        'name': 'Bebidas',
        'slug': 'bebidas',
      });

      expect(category.parentId, isNull);
      expect(category.iconUrl, isNull);
    });
  });

  group('AdminProductPage', () {
    test('guarda os dados de paginação', () {
      final page = AdminProductPage(
        items: [_product(stock: 1)],
        total: 21,
        page: 2,
        totalPages: 3,
      );

      expect(page.items, hasLength(1));
      expect(page.total, 21);
      expect(page.page, 2);
      expect(page.totalPages, 3);
    });
  });
}

AdminProduct _product({required int stock, String? stockStatus}) =>
    AdminProduct(
      id: 1,
      name: 'Produto',
      price: 10,
      stock: stock,
      rating: 0,
      isPopular: false,
      isNewArrival: false,
      stockStatus: stockStatus,
    );
