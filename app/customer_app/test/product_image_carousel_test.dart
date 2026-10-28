import 'package:customer_app/features/products/models/product.dart';
import 'package:customer_app/features/products/widgets/product_image_carousel.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'product model supports image lists and legacy single-image responses',
    () {
      final legacy = Product.fromJson({
        'id': 1,
        'name': 'Legacy',
        'price': '10.00',
        'stock': 2,
        'rating': '4.0',
        'image_url': '/legacy.jpg',
      });
      expect(legacy.images, ['/legacy.jpg']);

      final multiple = Product.fromJson({
        'id': 2,
        'name': 'Multiple',
        'price': '20.00',
        'stock': 3,
        'rating': '4.5',
        'image_url': '/one.jpg',
        'image_urls': ['/one.jpg', '/two.jpg', '/three.jpg'],
      });
      expect(multiple.images, ['/one.jpg', '/two.jpg', '/three.jpg']);
    },
  );

  testWidgets('carousel updates the selected indicator after swipe', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: 320,
              child: ProductImageCarousel(
                images: ['/one.jpg', '/two.jpg', '/three.jpg'],
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(PageView), findsOneWidget);
    expect(find.bySemanticsLabel('Imagem 1 de 3'), findsOneWidget);
    expect(find.bySemanticsLabel('Imagem 2 de 3'), findsOneWidget);
    expect(find.bySemanticsLabel('Imagem 3 de 3'), findsOneWidget);

    await tester.drag(find.byType(PageView), const Offset(-250, 0));
    await tester.pumpAndSettle();
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Semantics &&
            widget.properties.label == 'Imagem 2 de 3' &&
            widget.properties.selected == true,
      ),
      findsOneWidget,
    );
  });

  testWidgets('single image carousel has no position indicators', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 320,
            child: ProductImageCarousel(images: ['/one.jpg']),
          ),
        ),
      ),
    );
    expect(find.byType(PageView), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Semantics &&
            widget.properties.label?.startsWith('Imagem ') == true,
      ),
      findsNothing,
    );
  });

  testWidgets('compact carousel fits all indicators in a product card', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 180,
            height: 120,
            child: ProductImageCarousel(
              images: List.generate(20, (index) => '/image-$index.jpg'),
              compact: true,
            ),
          ),
        ),
      ),
    );
    expect(find.bySemanticsLabel('Imagem 20 de 20'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
