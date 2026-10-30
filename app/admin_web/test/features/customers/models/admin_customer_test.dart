import 'package:admin_web/features/customers/models/admin_customer.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AdminCustomer.fromJson', () {
    test('lê a resposta do endpoint administrativo', () {
      final customer = AdminCustomer.fromJson({
        'id': 42,
        'fullName': 'Ana Silva',
        'email': 'ana@example.com',
        'phone': '+258840000000',
        'avatarUrl': '/uploads/avatars/ana.png',
        'createdAt': '2026-01-15T10:30:00.000Z',
      });

      expect(customer.id, '42');
      expect(customer.name, 'Ana Silva');
      expect(customer.email, 'ana@example.com');
      expect(customer.phone, '+258840000000');
      expect(customer.photoUrl, '/uploads/avatars/ana.png');
      expect(customer.createdAt, DateTime.parse('2026-01-15T10:30:00.000Z'));
    });

    test('suporta variantes snake_case e photo_url', () {
      final customer = AdminCustomer.fromJson({
        'id': 'abc',
        'full_name': 'Carlos',
        'photo_url': '/uploads/avatars/carlos.png',
        'created_at': '2026-02-20T08:00:00.000Z',
      });

      expect(customer.id, 'abc');
      expect(customer.name, 'Carlos');
      expect(customer.photoUrl, '/uploads/avatars/carlos.png');
      expect(customer.createdAt, DateTime.parse('2026-02-20T08:00:00.000Z'));
    });

    test('usa valores seguros quando faltam campos', () {
      final customer = AdminCustomer.fromJson({});

      expect(customer.id, '');
      expect(customer.name, 'Sem nome');
      expect(customer.email, '');
      expect(customer.phone, '');
      expect(customer.photoUrl, isNull);
      expect(customer.createdAt, isNull);
    });

    test('devolve createdAt nulo para datas inválidas', () {
      final customer = AdminCustomer.fromJson({'created_at': 'data inválida'});

      expect(customer.createdAt, isNull);
    });
  });
}
