import 'package:customer_app/features/payment_methods/domain/models/payment_method.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('PaymentMethod', () {
    test('maps an M-Pesa method and masks the phone number', () {
      final method = PaymentMethod.fromJson({
        'id': 3,
        'type': 'mpesa',
        'label': 'Pessoal',
        'phone': '+258841234567',
        'isDefault': true,
      });

      expect(method.type, PaymentMethodType.mpesa);
      expect(method.title, 'Pessoal');
      expect(method.maskedValue, '•••• 4567');
      expect(method.isDefault, isTrue);
    });

    test('maps a Visa method and formats its expiry', () {
      final method = PaymentMethod.fromJson({
        'id': 4,
        'type': 'visa',
        'card_last4': '1111',
        'account_name': 'Ana Mucavele',
        'expiry_month': 12,
        'expiry_year': 2028,
        'is_default': false,
      });

      expect(method.type, PaymentMethodType.visa);
      expect(method.title, 'Visa');
      expect(method.maskedValue, '•••• 1111 · 12/28');
      expect(method.accountName, 'Ana Mucavele');
      expect(method.expiryLabel, '12/28');
    });

    test('uses the type label when no custom label is stored', () {
      final method = PaymentMethod.fromJson({
        'id': 5,
        'type': 'visa',
        'label': '   ',
        'card_last4': '4242',
        'expiry_month': 1,
        'expiry_year': 2027,
      });

      expect(method.title, 'Visa');
    });
  });
}
