import 'dart:async';

import 'package:customer_app/features/auth/models/user.dart';
import 'package:customer_app/features/auth/providers/auth_providers.dart';
import 'package:customer_app/features/auth/widgets/phone_number_field.dart';
import 'package:customer_app/features/products/models/product.dart';
import 'package:customer_app/features/products/widgets/product_card.dart';
import 'package:customer_app/features/products/widgets/product_grid_layout.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  FlutterSecureStorage.setMockInitialValues({});

  const viewports = <Size>[
    Size(320, 568),
    Size(360, 640),
    Size(390, 844),
    Size(430, 932),
    Size(768, 1024),
    Size(568, 320), // compact phone in landscape
  ];

  testWidgets('product grid cards fit target viewports and text scales', (
    tester,
  ) async {
    final product = Product(
      id: 1,
      name:
          'Product with a deliberately long name to exercise card truncation',
      price: 123456789.99,
      stock: 3,
      rating: 4.8,
      categoryName: 'A category name that is also intentionally long',
    );

    for (final viewport in viewports) {
      tester.view.physicalSize = viewport;
      tester.view.devicePixelRatio = 1;
      for (final textScale in [1.0, 1.3, 1.5]) {
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              authControllerProvider.overrideWith(_PendingAuthController.new),
            ],
            child: MaterialApp(
              home: Builder(
                builder: (context) => MediaQuery(
                  data: MediaQuery.of(context).copyWith(
                    textScaler: TextScaler.linear(textScale),
                  ),
                  child: Scaffold(
                    body: Builder(
                      builder: (context) => GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate: productGridDelegate(
                          context,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                        ),
                        itemCount: 4,
                        itemBuilder: (context, index) => ProductCard(
                          product: product,
                          onTap: () {},
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(
          tester.takeException(),
          isNull,
          reason: 'Layout exception at $viewport with text scale $textScale',
        );
        expect(find.byType(ProductCard), findsWidgets);
        expect(find.byTooltip('Add to cart'), findsWidgets);
      }
    }

    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  });

  testWidgets('phone number fields remain available on a compact screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 568);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final controller = TextEditingController();
    addTearDown(controller.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: TextScaler.linear(1.5),
            ),
            child: Scaffold(
              body: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: PhoneNumberField(
                  controller: controller,
                  countryCode: '+258',
                  onCountryCodeChanged: (_) {},
                  validator: (_) => null,
                ),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.byType(DropdownButtonFormField<String>), findsOneWidget);
    expect(find.byType(TextFormField), findsOneWidget);
  });
}

class _PendingAuthController extends AuthController {
  @override
  Future<User?> build() => Completer<User?>().future;
}
