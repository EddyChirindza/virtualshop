import 'package:customer_app/features/auth/models/user.dart';
import 'package:customer_app/features/auth/providers/auth_providers.dart';
import 'package:customer_app/features/products/models/product.dart';
import 'package:customer_app/features/products/widgets/product_card.dart';
import 'package:customer_app/core/session/session_controller.dart';
import 'package:customer_app/features/cart/models/cart_item.dart';
import 'package:customer_app/features/cart/models/cart_state.dart';
import 'package:customer_app/features/cart/providers/cart_provider.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  FlutterSecureStorage.setMockInitialValues({});

  testWidgets('product card changes and displays its cart quantity', (
    tester,
  ) async {
    final product = Product(
      id: 1,
      name: 'Arroz 5kg',
      price: 450,
      stock: 3,
      rating: 4.8,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authControllerProvider.overrideWith(_AuthenticatedAuthController.new),
          sessionControllerProvider.overrideWith(
            _AuthenticatedSessionController.new,
          ),
          cartControllerProvider.overrideWith(_TestCartController.new),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: 220,
                height: 250,
                child: ProductCard(product: product, onTap: () {}),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.byTooltip('Add to cart'));
    await tester.pumpAndSettle();
    expect(find.text('1'), findsOneWidget);

    await tester.tap(find.byTooltip('Increase quantity'));
    await tester.pumpAndSettle();
    expect(find.text('2'), findsOneWidget);

    await tester.tap(find.byTooltip('Decrease quantity'));
    await tester.pumpAndSettle();
    expect(find.text('1'), findsOneWidget);

    await tester.tap(find.byTooltip('Decrease quantity'));
    await tester.pumpAndSettle();
    expect(find.byTooltip('Add to cart'), findsOneWidget);
    expect(find.text('1'), findsNothing);
  });

  testWidgets('mostra o estado do stock sem revelar a quantidade', (
    tester,
  ) async {
    final product = Product(
      id: 2,
      name: 'Leite',
      price: 450,
      stock: 3,
      rating: 4.5,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authControllerProvider.overrideWith(_AuthenticatedAuthController.new),
          sessionControllerProvider.overrideWith(
            _AuthenticatedSessionController.new,
          ),
          cartControllerProvider.overrideWith(_TestCartController.new),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: 220,
                height: 250,
                child: ProductCard(product: product, onTap: () {}),
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.text('Low stock'), findsOneWidget);
    expect(find.text('3'), findsNothing);
  });
}

class _AuthenticatedAuthController extends AuthController {
  @override
  Future<User?> build() async {
    const user = User(id: 1, name: 'Cliente', email: 'cliente@example.com');
    ref.read(sessionControllerProvider.notifier).beginSession(user.id);
    return user;
  }
}

class _AuthenticatedSessionController extends SessionController {
  @override
  SessionState build() => const SessionState(userId: 1, generation: 1);
}

class _TestCartController extends CartController {
  @override
  CartState build() => const CartState();

  @override
  bool addProduct(Product product) {
    final items = [...state.items];
    final index = items.indexWhere((item) => item.productId == product.id);
    if (index >= 0) {
      items[index] = items[index].copyWith(quantity: items[index].quantity + 1);
    } else {
      items.add(
        CartItem(
          productId: product.id,
          product: product,
          quantity: 1,
          unitPrice: product.price,
        ),
      );
    }
    state = state.copyWith(items: items);
    return true;
  }

  @override
  void updateQuantity(int productId, int quantity) {
    final items = [...state.items];
    final index = items.indexWhere((item) => item.productId == productId);
    if (index < 0) return;
    if (quantity <= 0) {
      items.removeAt(index);
    } else {
      items[index] = items[index].copyWith(quantity: quantity);
    }
    state = state.copyWith(items: items);
  }
}
