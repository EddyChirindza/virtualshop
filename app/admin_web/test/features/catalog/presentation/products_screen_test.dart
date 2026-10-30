import 'package:admin_web/features/catalog/data/catalog_repository.dart';
import 'package:admin_web/features/catalog/presentation/screens/products_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../helpers/fake_dio.dart';

void main() {
  testWidgets('edita a quantidade de stock e envia o valor numérico', (
    tester,
  ) async {
    Map<String, dynamic>? updatedFields;
    final fake = FakeAdminApi((request) {
      if (request.method == 'GET' && request.path == '/products') {
        return jsonResponse({
          'data': [
            {
              'id': 1,
              'name': 'Café',
              'price': '100.00',
              'stock': 2,
              'rating': '4.5',
              'image_urls': ['/uploads/products/cafe.png'],
              'stock_status': 'low_stock',
              'is_popular': false,
              'is_new_arrival': true,
            },
          ],
          'page': 1,
          'total': 1,
          'totalPages': 1,
        });
      }
      if (request.method == 'GET' && request.path == '/categories') {
        return jsonResponse({'data': []});
      }
      if (request.method == 'PATCH' && request.path == '/products/1') {
        updatedFields = request.data as Map<String, dynamic>;
        return jsonResponse({'success': true});
      }
      throw StateError('Pedido inesperado: ${request.method} ${request.path}');
    });

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ProductsScreen(repository: CatalogRepository(api: fake.api)),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Editar'));
    await tester.pumpAndSettle();

    final stockField = find.widgetWithText(
      TextFormField,
      'Quantidade em stock',
    );
    expect(stockField, findsOneWidget);
    expect(tester.widget<TextFormField>(stockField).controller?.text, '2');

    await tester.enterText(stockField, '7');
    await tester.tap(find.text('Guardar'));
    await tester.pumpAndSettle();

    expect(updatedFields?['stock'], 7);
    expect(updatedFields?.containsKey('stock_status'), isFalse);
  });
}
