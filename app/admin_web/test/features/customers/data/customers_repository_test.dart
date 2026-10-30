import 'package:admin_web/features/customers/data/customers_repository.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../helpers/fake_dio.dart';

void main() {
  group('CustomersRepository.load', () {
    test('lê uma lista directa em data', () async {
      final fake = FakeAdminApi((request) {
        expect(request.method, 'GET');
        expect(request.path, '/admin/customers');
        return jsonResponse({
          'data': [
            {
              'id': 1,
              'fullName': 'Ana',
              'email': 'ana@example.com',
              'phone': '+258840000000',
            },
          ],
        });
      });

      final customers = await CustomersRepository(api: fake.api).load();

      expect(customers, hasLength(1));
      expect(customers.single.name, 'Ana');
    });

    test('lê listas aninhadas em customers, users ou items', () async {
      for (final key in ['customers', 'users', 'items']) {
        final fake = FakeAdminApi(
          (_) => jsonResponse({
            'data': {
              key: [
                {'id': 1, 'full_name': 'Ana'},
              ],
            },
          }),
        );

        final customers = await CustomersRepository(api: fake.api).load();

        expect(customers, hasLength(1), reason: 'chave $key');
        expect(customers.single.name, 'Ana', reason: 'chave $key');
      }
    });

    test('ignora entradas que não sejam mapas', () async {
      final fake = FakeAdminApi(
        (_) => jsonResponse({
          'data': [
            {'id': 1, 'fullName': 'Ana'},
            'inválido',
            null,
            {'id': 2, 'fullName': 'Carlos'},
          ],
        }),
      );

      final customers = await CustomersRepository(api: fake.api).load();

      expect(customers.map((customer) => customer.name), ['Ana', 'Carlos']);
    });

    test('falha quando o formato da resposta é inválido', () async {
      final fake = FakeAdminApi(
        (_) => jsonResponse({'data': 'formato inesperado'}),
      );

      expect(
        () => CustomersRepository(api: fake.api).load(),
        throwsA(isA<FormatException>()),
      );
    });

    test('falha quando data está ausente', () async {
      final fake = FakeAdminApi((_) => jsonResponse({'success': true}));

      expect(
        () => CustomersRepository(api: fake.api).load(),
        throwsA(isA<FormatException>()),
      );
    });
  });
}
