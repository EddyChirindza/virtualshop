import 'package:admin_web/features/notifications/data/admin_notifications_repository.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../helpers/fake_dio.dart';

void main() {
  group('AdminNotificationsRepository.list', () {
    test('lê uma lista directa em data', () async {
      final fake = FakeAdminApi((request) {
        expect(request.method, 'GET');
        expect(request.path, '/admin/notifications');
        expect(request.queryParameters['page'], 1);
        expect(request.queryParameters['limit'], 50);
        return jsonResponse({
          'data': [
            {'id': 1, 'title': 'Aviso', 'message': 'Mensagem'},
          ],
        });
      });

      final notifications = await AdminNotificationsRepository(api: fake.api)
          .list();

      expect(notifications, hasLength(1));
      expect(notifications.single.title, 'Aviso');
      expect(notifications.single.status, 'draft');
    });

    test('lê listas aninhadas em items ou notifications', () async {
      for (final key in ['items', 'notifications']) {
        final fake = FakeAdminApi(
          (_) => jsonResponse({
            'data': {
              key: [
                {'id': 2, 'title': 'Aviso', 'message': 'Mensagem'},
              ],
            },
          }),
        );

        final notifications = await AdminNotificationsRepository(api: fake.api)
            .list();

        expect(notifications, hasLength(1), reason: 'chave $key');
        expect(notifications.single.id, '2', reason: 'chave $key');
      }
    });

    test('devolve uma lista vazia para um formato inesperado', () async {
      final fake = FakeAdminApi(
        (_) => jsonResponse({
          'data': {'items': 'formato inesperado'},
        }),
      );

      final notifications = await AdminNotificationsRepository(api: fake.api)
          .list();

      expect(notifications, isEmpty);
    });
  });

  group('AdminNotificationsRepository.create', () {
    test('envia todos os campos opcionais', () async {
      final expiresAt = DateTime.utc(2026, 12, 31, 23, 59, 59);
      final fake = FakeAdminApi((request) {
        expect(request.method, 'POST');
        expect(request.path, '/admin/notifications');
        expect(request.data, {
          'title': 'Promoção',
          'message': 'Desconto de 20%.',
          'type': 'promotion',
          'status': 'published',
          'recipient_scope': 'all_customers',
          'product_id': 9,
          'expires_at': expiresAt.toIso8601String(),
        });
        return jsonResponse({'success': true}, statusCode: 201);
      });

      await AdminNotificationsRepository(api: fake.api).create(
        title: 'Promoção',
        message: 'Desconto de 20%.',
        type: 'promotion',
        status: 'published',
        productId: 9,
        expiresAt: expiresAt,
      );
    });

    test('omite os campos opcionais quando não são indicados', () async {
      final fake = FakeAdminApi((request) {
        expect(request.data, {
          'title': 'Aviso',
          'message': 'Mensagem',
          'type': 'general',
          'status': 'draft',
          'recipient_scope': 'all_customers',
        });
        return jsonResponse({'success': true}, statusCode: 201);
      });

      await AdminNotificationsRepository(api: fake.api).create(
        title: 'Aviso',
        message: 'Mensagem',
        type: 'general',
        status: 'draft',
      );
    });
  });

  test('archive usa o ID codificado no caminho', () async {
    final fake = FakeAdminApi((request) {
      expect(request.method, 'PATCH');
      expect(request.path, '/admin/notifications/a%2Fb/archive');
      return jsonResponse({'success': true});
    });

    await AdminNotificationsRepository(api: fake.api).archive('a/b');

    expect(fake.requests, hasLength(1));
  });
}
