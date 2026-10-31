import 'package:customer_app/features/cart/models/cart_item.dart';
import 'package:customer_app/features/cart/models/cart_state.dart';
import 'package:customer_app/features/cart/providers/cart_provider.dart';
import 'package:customer_app/features/checkout/screens/checkout_screen.dart';
import 'package:customer_app/features/payment_methods/domain/models/payment_method.dart';
import 'package:customer_app/features/payment_methods/presentation/providers/payment_methods_provider.dart';
import 'package:customer_app/features/products/models/product.dart';
import 'package:customer_app/features/profile/domain/models/profile_address.dart';
import 'package:customer_app/features/profile/presentation/providers/profile_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final sampleProduct = Product(
    id: 1,
    name: 'Produto Teste',
    price: 100,
    stock: 5,
    rating: 5.0,
  );

  final sampleCartItem = CartItem(
    productId: 1,
    product: sampleProduct,
    quantity: 2,
    unitPrice: 100,
  );

  final samplePaymentMethod = PaymentMethod(
    id: 10,
    type: PaymentMethodType.mpesa,
    label: 'M-Pesa Pessoal',
    phone: '+258841234567',
    isDefault: true,
  );

  final sampleAddress = const ProfileAddress(
    id: 20,
    label: 'Casa',
    province: 'Maputo',
    city: 'Maputo',
    neighborhood: 'Polana',
    street: 'Av. Julius Nyerere',
    number: '123',
    isDefault: true,
  );

  Widget createTestWidget({
    CartState? cartState,
    List<PaymentMethod>? paymentMethods,
    List<ProfileAddress>? addresses,
  }) {
    return ProviderScope(
      overrides: [
        cartControllerProvider.overrideWith(
          () => _FakeCartController(
            cartState ?? CartState(items: [sampleCartItem]),
          ),
        ),
        paymentMethodsProvider.overrideWith(
          () => _FakePaymentMethodsController(
            paymentMethods ?? [samplePaymentMethod],
          ),
        ),
        profileAddressesProvider.overrideWith(
          () => _FakeAddressesController(addresses ?? [sampleAddress]),
        ),
      ],
      child: const MaterialApp(
        locale: Locale('pt'),
        supportedLocales: [Locale('en'), Locale('pt')],
        localizationsDelegates: [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: CheckoutScreen(),
      ),
    );
  }

  group('CheckoutScreen', () {
    testWidgets(
      'renders payment methods, delivery selector and order summary',
      (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pumpAndSettle();

        expect(find.text('Finalizar Compra'), findsOneWidget);
        expect(find.text('1. Método de Pagamento'), findsOneWidget);
        expect(find.text('2. Método de Entrega'), findsOneWidget);
        expect(find.text('3. Resumo da Compra'), findsOneWidget);
        expect(find.text('M-Pesa Pessoal'), findsOneWidget);
        expect(find.text('Casa'), findsOneWidget);
        expect(find.text('Entrega ao domicílio'), findsOneWidget);
        expect(find.text('Levantamento na loja'), findsOneWidget);
      },
    );

    testWidgets(
      'shows alternative message when no payment methods are configured',
      (tester) async {
        await tester.pumpWidget(createTestWidget(paymentMethods: []));
        await tester.pumpAndSettle();

        expect(
          find.text('Não tens métodos de pagamento configurados.'),
          findsOneWidget,
        );
        expect(find.text('Adicionar Método de Pagamento'), findsOneWidget);
      },
    );

    testWidgets(
      'shows alternative message when home delivery is selected but no addresses exist',
      (tester) async {
        await tester.pumpWidget(createTestWidget(addresses: []));
        await tester.pumpAndSettle();

        expect(
          find.text('Não tens endereços de entrega configurados.'),
          findsOneWidget,
        );
        expect(find.text('Adicionar Endereço'), findsOneWidget);
      },
    );

    testWidgets(
      'switching to store pickup hides delivery addresses and sets free delivery fee',
      (tester) async {
        await tester.pumpWidget(createTestWidget());
        await tester.pumpAndSettle();

        await tester.tap(find.text('Levantamento na loja'));
        await tester.pumpAndSettle();

        expect(find.text('Levantamento na Loja Principal'), findsOneWidget);
        expect(
          find.text(
            'Sem custos de entrega. Disponível após confirmação do pedido.',
          ),
          findsOneWidget,
        );
        expect(find.text('Grátis'), findsOneWidget);
      },
    );
  });
}

class _FakeCartController extends CartController {
  _FakeCartController(this._initial);
  final CartState _initial;

  @override
  CartState build() => _initial;

  @override
  Future<bool> checkout({
    int? deliveryAddressId,
    int? paymentMethodId,
    String? deliveryMethod,
    String? couponCode,
    String? notes,
  }) async {
    return true;
  }
}

class _FakePaymentMethodsController extends PaymentMethodsController {
  _FakePaymentMethodsController(this._initial);
  final List<PaymentMethod> _initial;

  @override
  Future<List<PaymentMethod>> build() async => _initial;
}

class _FakeAddressesController extends ProfileAddressesController {
  _FakeAddressesController(this._initial);
  final List<ProfileAddress> _initial;

  @override
  Future<List<ProfileAddress>> build() async => _initial;
}
