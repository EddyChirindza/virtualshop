import 'package:customer_app/features/auth/widgets/phone_number_field.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('International phone numbers', () {
    test('combines country prefix and local digits', () {
      expect(formatInternationalPhone('+258', '84 123 4567'), '+258841234567');
      expect(formatInternationalPhone('+27', '082 123 4567'), '+27821234567');
      expect(
        formatInternationalPhone('+55', '(11) 91234-5678'),
        '+5511912345678',
      );
    });

    test('checks international length including calling code', () {
      expect(isValidInternationalPhone('+258', '841234567'), isTrue);
      expect(isValidInternationalPhone('+27', '821234567'), isTrue);
      expect(isValidInternationalPhone('+258', '123'), isFalse);
      expect(isValidInternationalPhone('+258', '1234567890123'), isFalse);
    });

    test('offers common calling codes', () {
      final codes = phoneCountryCodes.map((country) => country.code).toSet();
      expect(codes, containsAll(['+258', '+27', '+55', '+351', '+1']));
    });

    testWidgets('allows selecting a different calling code', (tester) async {
      final controller = TextEditingController();
      var selectedCode = '+258';

      await tester.pumpWidget(
        MaterialApp(
          locale: const Locale('pt'),
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) => Padding(
                padding: const EdgeInsets.all(16),
                child: PhoneNumberField(
                  controller: controller,
                  countryCode: selectedCode,
                  onCountryCodeChanged: (value) =>
                      setState(() => selectedCode = value),
                  validator: (_) => null,
                ),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.byType(DropdownButtonFormField<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.textContaining('+27'));
      await tester.pumpAndSettle();

      expect(selectedCode, '+27');
      expect(find.text('+27 ZA'), findsOneWidget);
      controller.dispose();
    });
  });
}
