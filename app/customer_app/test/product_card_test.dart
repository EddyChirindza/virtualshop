import 'dart:async';

import 'package:customer_app/features/auth/models/user.dart';
import 'package:customer_app/features/auth/providers/auth_providers.dart';
import 'package:customer_app/features/products/models/product.dart';
import 'package:customer_app/features/products/widgets/product_card.dart';
import 'package:flutter/material.dart';
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
          authControllerProvider.overrideWith(_PendingAuthController.new),
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
}

class _PendingAuthController extends AuthController {
  @override
  Future<User?> build() => Completer<User?>().future;
}
