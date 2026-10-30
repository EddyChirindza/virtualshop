import 'package:customer_app/features/auth/models/user.dart';
import 'package:customer_app/features/auth/providers/auth_providers.dart';
import 'package:customer_app/features/cart/data/local_cart_repository.dart';
import 'package:customer_app/features/cart/models/cart_item.dart';
import 'package:customer_app/features/cart/providers/cart_provider.dart';
import 'package:customer_app/features/products/models/product.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
  });

  group('LocalCartRepository', () {
    test('keeps carts separate per user and guest', () async {
      final firstUser = LocalCartRepository(userId: 1);
      final secondUser = LocalCartRepository(userId: 2);
      final guest = LocalCartRepository(userId: null);

      await firstUser.save([_item(productId: 1)]);
      await secondUser.save([_item(productId: 2)]);
      await guest.save([_item(productId: 3)]);

      expect((await firstUser.load()).single.productId, 1);
      expect((await secondUser.load()).single.productId, 2);
      expect((await guest.load()).single.productId, 3);
    });

    test('does not derive storage keys from access tokens', () async {
      const storage = FlutterSecureStorage();
      await storage.write(
        key: 'access_token',
        value: 'eyJhbGciOiJIUzI1NiJ9.payload.signature',
      );

      final repository = LocalCartRepository(userId: 7);
      await repository.save([_item(productId: 7)]);

      final keys = (await storage.readAll()).keys;
      expect(keys, contains('virtualshop_cart_items_user_7'));
      expect(keys.any((key) => key.contains('eyJhbGciOiJ')), isFalse);
    });

    test('provider scopes guest and authenticated carts by user id', () async {
      final guestContainer = ProviderContainer();
      addTearDown(guestContainer.dispose);
      final guestRepository = guestContainer.read(localCartRepositoryProvider);
      await guestRepository.save([_item(productId: 10)]);

      final userContainer = ProviderContainer(
        overrides: [
          authControllerProvider.overrideWith(
            () => _AuthenticatedAuthController(
              const User(id: 9, name: 'Cliente', email: 'cliente@example.com'),
            ),
          ),
        ],
      );
      addTearDown(userContainer.dispose);
      await userContainer.read(authControllerProvider.future);
      final userRepository = userContainer.read(localCartRepositoryProvider);
      await userRepository.save([_item(productId: 11)]);

      final keys = (await const FlutterSecureStorage().readAll()).keys;
      expect(keys, contains('virtualshop_cart_items_guest'));
      expect(keys, contains('virtualshop_cart_items_user_9'));
      expect((await guestRepository.load()).single.productId, 10);
      expect((await userRepository.load()).single.productId, 11);
    });
  });
}

CartItem _item({required int productId}) {
  final product = Product(
    id: productId,
    name: 'Produto $productId',
    price: 100,
    stock: 10,
    rating: 4,
  );
  return CartItem(
    productId: productId,
    product: product,
    quantity: 1,
    unitPrice: product.price,
  );
}

class _AuthenticatedAuthController extends AuthController {
  _AuthenticatedAuthController(this._user);

  final User _user;

  @override
  Future<User?> build() async => _user;
}
