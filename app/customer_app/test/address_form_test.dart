import 'package:customer_app/features/profile/domain/models/profile_address.dart';
import 'package:customer_app/features/profile/presentation/providers/profile_providers.dart';
import 'package:customer_app/features/profile/presentation/screens/address_form_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('new address starts with the same default as customer_web', (
    tester,
  ) async {
    Map<String, dynamic>? saved;

    await _pumpForm(tester, _form(onAdd: (fields) async => saved = fields));

    expect(find.byType(DropdownButtonFormField<String>), findsOneWidget);
    expect(find.text('Maputo Cidade'), findsOneWidget);

    await _fillRequiredFields(tester);
    await tester.tap(find.text('Guardar endereço'));
    await tester.pumpAndSettle();

    expect(saved?['province'], 'Maputo Cidade');
  });

  testWidgets('edit shows the saved province and allows changing it', (
    tester,
  ) async {
    Map<String, dynamic>? saved;

    await _pumpForm(
      tester,
      _form(
        address: const ProfileAddress(
          id: 3,
          label: 'Casa',
          province: 'Maputo Província',
          city: 'Maputo',
          neighborhood: 'Polana',
          street: 'Av. Julius Nyerere',
          number: '12',
        ),
        onUpdate: (_, fields) async => saved = fields,
      ),
    );

    expect(find.text('Maputo Província'), findsOneWidget);

    await tester.tap(find.byType(DropdownButtonFormField<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Gaza').last);
    await tester.pumpAndSettle();

    await tester.tap(find.text('Guardar endereço'));
    await tester.pumpAndSettle();

    expect(saved?['province'], 'Gaza');
  });

  testWidgets('keeps an old province visible when editing', (tester) async {
    Map<String, dynamic>? saved;

    await _pumpForm(
      tester,
      _form(
        address: const ProfileAddress(
          id: 4,
          label: 'Casa',
          province: 'Maputo',
          city: 'Xai-Xai',
          neighborhood: 'Polana',
          street: 'Av. Julius Nyerere',
          number: '12',
        ),
        onUpdate: (_, fields) async => saved = fields,
      ),
    );

    expect(find.text('Maputo'), findsOneWidget);

    await tester.tap(find.text('Guardar endereço'));
    await tester.pumpAndSettle();

    expect(saved?['province'], 'Maputo');
  });
}

Future<void> _pumpForm(WidgetTester tester, Widget widget) async {
  tester.view.physicalSize = const Size(1200, 1800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(widget);
  await tester.pumpAndSettle();
}

Future<void> _fillRequiredFields(WidgetTester tester) async {
  final fields = find.byType(TextFormField);
  await tester.enterText(fields.at(0), 'Casa');
  await tester.enterText(fields.at(1), 'Maputo');
  await tester.enterText(fields.at(2), 'Polana');
  await tester.enterText(fields.at(3), 'Av. Julius Nyerere');
  await tester.enterText(fields.at(4), '12');
}

Widget _form({
  ProfileAddress? address,
  Future<void> Function(Map<String, dynamic>)? onAdd,
  Future<void> Function(int, Map<String, dynamic>)? onUpdate,
}) {
  return ProviderScope(
    overrides: [
      profileAddressesProvider.overrideWith(
        () => _FakeAddressesController(onAdd: onAdd, onUpdate: onUpdate),
      ),
    ],
    child: MaterialApp(
      locale: const Locale('pt'),
      supportedLocales: const [Locale('pt')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: AddressFormScreen(address: address),
    ),
  );
}

class _FakeAddressesController extends ProfileAddressesController {
  _FakeAddressesController({this.onAdd, this.onUpdate});

  final Future<void> Function(Map<String, dynamic>)? onAdd;
  final Future<void> Function(int, Map<String, dynamic>)? onUpdate;

  @override
  Future<List<ProfileAddress>> build() async => const [];

  @override
  Future<void> add(Map<String, dynamic> fields) async {
    await onAdd?.call(fields);
  }

  @override
  Future<void> updateAddress(int id, Map<String, dynamic> fields) async {
    await onUpdate?.call(id, fields);
  }
}
