import 'package:customer_app/features/products/models/product.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Product.availability', () {
    test('marca como esgotado quando a quantidade é zero', () {
      expect(_product(0).availability, 'out_of_stock');
    });

    test('marca últimas unidades entre 1 e 5', () {
      for (var stock = 1; stock <= 5; stock++) {
        expect(_product(stock).availability, 'low_stock');
      }
    });

    test('marca como disponível a partir de 6 unidades', () {
      expect(_product(6).availability, 'in_stock');
      expect(_product(50).availability, 'in_stock');
    });
  });
}

Product _product(int stock) =>
    Product(id: 1, name: 'Produto', price: 100, stock: stock, rating: 0);
