import 'package:admin_web/core/auth/admin_session.dart';
import 'package:admin_web/core/network/admin_api.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../helpers/fake_dio.dart';

void main() {
  group('AdminApi interceptor de autenticação', () {
    test('renova o token e repete o pedido original', () async {
      final refreshApi = FakeAdminApi((request) {
        expect(request.path, '/auth/refresh');
        expect(request.data, {'refreshToken': 'refresh-1'});
        return jsonResponse({
          'data': {'token': 'access-2', 'refreshToken': 'refresh-2'},
        });
      });
      var calls = 0;
      final dataApi = FakeAdminApi((request) {
        calls++;
        if (calls == 1) {
          expect(request.headers['Authorization'], 'Bearer access-1');
          return jsonResponse({'message': 'Token expirado.'}, statusCode: 401);
        }
        expect(request.headers['Authorization'], 'Bearer access-2');
        return jsonResponse({'success': true, 'data': []});
      });
      final session = AdminSession(dio: refreshApi.dio)
        ..start(
          const AdminTokens(accessToken: 'access-1', refreshToken: 'refresh-1'),
        );
      final api = AdminApi(dio: dataApi.dio, session: session);

      final response = await api.dio.get<dynamic>('/products');

      expect(response.statusCode, 200);
      expect(calls, 2);
      expect(dataApi.requests, hasLength(2));
      expect(refreshApi.requests, hasLength(1));
      expect(session.accessToken, 'access-2');
    });

    test('expira a sessão e não repete quando a renovação falha', () async {
      var expiredCalls = 0;
      final refreshApi = FakeAdminApi(
        (_) => jsonResponse({'message': 'Sessão inválida.'}, statusCode: 401),
      );
      final dataApi = FakeAdminApi(
        (_) => jsonResponse({'message': 'Token expirado.'}, statusCode: 401),
      );
      final session =
          AdminSession(dio: refreshApi.dio, onExpired: () => expiredCalls++)
            ..start(
              const AdminTokens(
                accessToken: 'access-1',
                refreshToken: 'refresh-1',
              ),
            );
      final api = AdminApi(dio: dataApi.dio, session: session);

      await expectLater(
        api.dio.get<dynamic>('/products'),
        throwsA(
          isA<DioException>().having(
            (error) => error.response?.statusCode,
            'status',
            401,
          ),
        ),
      );

      expect(expiredCalls, 1);
      expect(session.isAuthenticated, isFalse);
      expect(dataApi.requests, hasLength(1));
      expect(refreshApi.requests, hasLength(1));
    });

    test(
      'repete apenas uma vez quando o novo token também é rejeitado',
      () async {
        final refreshApi = FakeAdminApi(
          (_) => jsonResponse({
            'data': {'token': 'access-2', 'refreshToken': 'refresh-2'},
          }),
        );
        final dataApi = FakeAdminApi(
          (_) => jsonResponse({'message': 'Sem acesso.'}, statusCode: 401),
        );
        final session = AdminSession(dio: refreshApi.dio)
          ..start(
            const AdminTokens(
              accessToken: 'access-1',
              refreshToken: 'refresh-1',
            ),
          );
        final api = AdminApi(dio: dataApi.dio, session: session);

        await expectLater(
          api.dio.get<dynamic>('/products'),
          throwsA(
            isA<DioException>().having(
              (error) => error.response?.statusCode,
              'status',
              401,
            ),
          ),
        );

        expect(dataApi.requests, hasLength(2));
        expect(refreshApi.requests, hasLength(1));
      },
    );

    test('não tenta renovar pedidos de autenticação sem sessão', () async {
      final refreshApi = FakeAdminApi(
        (_) => throw StateError('A renovação não devia ser chamada.'),
      );
      final dataApi = FakeAdminApi(
        (_) => jsonResponse({
          'message': 'Credenciais inválidas.',
        }, statusCode: 401),
      );
      final session = AdminSession(dio: refreshApi.dio);
      final api = AdminApi(dio: dataApi.dio, session: session);

      await expectLater(
        api.dio.post<dynamic>('/auth/login'),
        throwsA(isA<DioException>()),
      );

      expect(dataApi.requests, hasLength(1));
      expect(refreshApi.requests, isEmpty);
    });
  });
}
