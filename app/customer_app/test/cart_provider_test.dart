import 'package:customer_app/features/products/models/product.dart';
import 'package:customer_app/features/cart/providers/cart_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  FlutterSecureStorage.setMockInitialValues({});

  group('Cart provider', () {
    late ProviderContainer container;

    setUp(() {
      container = ProviderContainer();
    });

    tearDown(() {
      container.dispose();
    });

    test('adds a product once and accumulates quantity', () {
      final product = Product(
        id: 1,
        name: 'Arroz 5kg',
        price: 450,
        stock: 10,
        rating: 4.8,
      );

      final notifier = container.read(cartControllerProvider.notifier);

      notifier.addProduct(product);
      notifier.addProduct(product);
      notifier.addProduct(product);

      final cart = container.read(cartControllerProvider);
      expect(cart.items.length, 1);
      expect(cart.items.first.productId, 1);
      expect(cart.items.first.quantity, 3);
      expect(cart.items.first.subtotal, 1350);
      expect(cart.itemCount, 3);
      expect(cart.subtotal, 1350);
    });

    test('respects stock limit and removes item when quantity reaches zero', () {
      final product = Product(
        id: 2,
        name: 'Óleo',
        price: 250,
        stock: 2,
        rating: 4.2,
      );

      final notifier = container.read(cartControllerProvider.notifier);
      notifier.addProduct(product);
      notifier.addProduct(product);
      notifier.addProduct(product);

      final cart = container.read(cartControllerProvider);
      expect(cart.items.length, 1);
      expect(cart.items.first.quantity, 2);
      expect(cart.items.first.subtotal, 500);

      notifier.updateQuantity(product.id, 0);

      final updated = container.read(cartControllerProvider);
      expect(updated.items.isEmpty, isTrue);
      expect(updated.itemCount, 0);
    });
  });
}
