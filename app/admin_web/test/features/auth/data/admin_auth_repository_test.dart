import 'package:admin_web/features/auth/data/admin_auth_repository.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../helpers/fake_dio.dart';

void main() {
  group('AdminAuthRepository.login', () {
    test('envia as credenciais e devolve os tokens de administrador', () async {
      final fake = FakeAdminApi((request) {
        expect(request.method, 'POST');
        expect(request.path, '/auth/login');
        expect(request.data, {
          'identifier': 'admin@example.com',
          'password': 'segredo',
        });
        return jsonResponse({
          'success': true,
          'data': {
            'user': {'role': 'admin'},
            'token': 'jwt-token',
            'refreshToken': 'refresh-token',
          },
        });
      });

      final tokens = await AdminAuthRepository(api: fake.api)
          .login('admin@example.com', 'segredo');

      expect(tokens.accessToken, 'jwt-token');
      expect(tokens.refreshToken, 'refresh-token');
      expect(fake.requests, hasLength(1));
    });

    test('rejeita contas que não sejam administrador', () async {
      final fake = FakeAdminApi(
        (_) => jsonResponse({
          'data': {
            'user': {'role': 'customer'},
            'token': 'jwt-token',
            'refreshToken': 'refresh-token',
          },
        }),
      );

      expect(
        () =>
            AdminAuthRepository(api: fake.api)
                .login('cliente@example.com', 'segredo'),
        throwsA(
          isA<Exception>().having(
            (error) => error.toString(),
            'message',
            contains('não tem acesso'),
          ),
        ),
      );
    });

    test('rejeita uma resposta sem token de acesso', () async {
      final fake = FakeAdminApi(
        (_) => jsonResponse({
          'data': {
            'user': {'role': 'admin'},
            'token': '',
            'refreshToken': 'refresh-token',
          },
        }),
      );

      expect(
        () =>
            AdminAuthRepository(api: fake.api)
                .login('admin@example.com', 'segredo'),
        throwsA(
          isA<Exception>().having(
            (error) => error.toString(),
            'message',
            contains('token de acesso'),
          ),
        ),
      );
    });

    test('rejeita uma resposta sem token de renovação', () async {
      final fake = FakeAdminApi(
        (_) => jsonResponse({
          'data': {
            'user': {'role': 'admin'},
            'token': 'jwt-token',
          },
        }),
      );

      expect(
        () =>
            AdminAuthRepository(api: fake.api)
                .login('admin@example.com', 'segredo'),
        throwsA(
          isA<Exception>().having(
            (error) => error.toString(),
            'message',
            contains('token de renovação'),
          ),
        ),
      );
    });

    test('propaga erros de autenticação da API', () async {
      final fake = FakeAdminApi(
        (_) => jsonResponse({
          'message': 'Credenciais inválidas.',
        }, statusCode: 401),
      );

      expect(
        () =>
            AdminAuthRepository(api: fake.api)
                .login('admin@example.com', 'errada'),
        throwsA(isA<DioException>()),
      );
    });
  });
}
