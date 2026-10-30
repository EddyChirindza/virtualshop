import 'package:admin_web/features/notifications/data/admin_notifications_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AdminNotification.fromJson', () {
    test('lê os campos principais', () {
      final notification = AdminNotification.fromJson({
        'id': 9,
        'title': 'Nova promoção',
        'message': 'Desconto de 20% hoje.',
        'type': 'promotion',
        'status': 'published',
        'created_at': '2026-03-10T12:00:00.000Z',
      });

      expect(notification.id, '9');
      expect(notification.title, 'Nova promoção');
      expect(notification.message, 'Desconto de 20% hoje.');
      expect(notification.type, 'promotion');
      expect(notification.status, 'published');
      expect(
        notification.createdAt,
        DateTime.parse('2026-03-10T12:00:00.000Z'),
      );
    });

    test('suporta createdAt em camelCase', () {
      final notification = AdminNotification.fromJson({
        'createdAt': '2026-04-01T09:15:00.000Z',
      });

      expect(
        notification.createdAt,
        DateTime.parse('2026-04-01T09:15:00.000Z'),
      );
    });

    test('usa valores por omissão quando faltam campos', () {
      final notification = AdminNotification.fromJson({});

      expect(notification.id, '');
      expect(notification.title, '');
      expect(notification.message, '');
      expect(notification.type, 'general');
      expect(notification.status, 'draft');
      expect(notification.createdAt, isNull);
    });

    test('devolve createdAt nulo para datas inválidas', () {
      final notification = AdminNotification.fromJson({
        'created_at': 'data inválida',
      });

      expect(notification.createdAt, isNull);
    });
  });
}
