import 'dart:async';

import 'package:admin_web/core/auth/admin_session.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../helpers/fake_dio.dart';

void main() {
  group('AdminSession', () {
    test('arranca autenticada com o par de tokens', () {
      final fake = FakeAdminApi((_) => jsonResponse(null));
      final session = AdminSession(dio: fake.dio)
        ..start(
          const AdminTokens(accessToken: 'access-1', refreshToken: 'refresh-1'),
        );

      expect(session.isAuthenticated, isTrue);
      expect(session.accessToken, 'access-1');
    });

    test('renova o par de tokens', () async {
      final fake = FakeAdminApi((request) {
        expect(request.method, 'POST');
        expect(request.path, '/auth/refresh');
        expect(request.data, {'refreshToken': 'refresh-1'});
        return jsonResponse({
          'data': {'token': 'access-2', 'refreshToken': 'refresh-2'},
        });
      });
      final session = AdminSession(dio: fake.dio)
        ..start(
          const AdminTokens(accessToken: 'access-1', refreshToken: 'refresh-1'),
        );

      expect(await session.refresh(), isTrue);
      expect(session.accessToken, 'access-2');
      expect(session.isAuthenticated, isTrue);
      expect(fake.requests, hasLength(1));
    });

    test('reutiliza a renovação em chamadas concorrentes', () async {
      final requestStarted = Completer<void>();
      final pending = Completer<ResponseBody>();
      final fake = FakeAdminApi((_) {
        if (!requestStarted.isCompleted) requestStarted.complete();
        return pending.future;
      });
      final session = AdminSession(dio: fake.dio)
        ..start(
          const AdminTokens(accessToken: 'access-1', refreshToken: 'refresh-1'),
        );

      final first = session.refresh();
      final second = session.refresh();
      await requestStarted.future;

      expect(fake.requests, hasLength(1));
      pending.complete(
        jsonResponse({
          'data': {'token': 'access-2', 'refreshToken': 'refresh-2'},
        }),
      );

      expect(await Future.wait([first, second]), [true, true]);
      expect(fake.requests, hasLength(1));
    });

    test('expira a sessão quando a renovação falha', () async {
      var expiredCalls = 0;
      final fake = FakeAdminApi(
        (_) => jsonResponse({'message': 'Sessão inválida.'}, statusCode: 401),
      );
      final session =
          AdminSession(dio: fake.dio, onExpired: () => expiredCalls++)..start(
            const AdminTokens(
              accessToken: 'access-1',
              refreshToken: 'refresh-1',
            ),
          );

      expect(await session.refresh(), isFalse);
      expect(session.isAuthenticated, isFalse);
      expect(expiredCalls, 1);

      expect(await session.refresh(), isFalse);
      expect(expiredCalls, 1);
    });

    test('termina a sessão no servidor e localmente', () async {
      final fake = FakeAdminApi((request) {
        expect(request.method, 'POST');
        expect(request.path, '/auth/logout');
        expect(request.data, {'refreshToken': 'refresh-1'});
        return jsonResponse({'success': true});
      });
      final session = AdminSession(dio: fake.dio)
        ..start(
          const AdminTokens(accessToken: 'access-1', refreshToken: 'refresh-1'),
        );

      await session.logout();

      expect(fake.requests, hasLength(1));
      expect(session.isAuthenticated, isFalse);
    });

    test('limpa a sessão mesmo quando o servidor falha no logout', () async {
      final fake = FakeAdminApi(
        (_) => jsonResponse({'message': 'Indisponível.'}, statusCode: 500),
      );
      final session = AdminSession(dio: fake.dio)
        ..start(
          const AdminTokens(accessToken: 'access-1', refreshToken: 'refresh-1'),
        );

      await session.logout();

      expect(session.isAuthenticated, isFalse);
    });

    test(
      'não reativa a sessão se a renovação terminar após o logout',
      () async {
        final pending = Completer<ResponseBody>();
        final fake = FakeAdminApi((request) {
          if (request.path == '/auth/refresh') return pending.future;
          return jsonResponse({'success': true});
        });
        final session = AdminSession(dio: fake.dio)
          ..start(
            const AdminTokens(
              accessToken: 'access-1',
              refreshToken: 'refresh-1',
            ),
          );

        final refreshFuture = session.refresh();
        await session.logout();
        pending.complete(
          jsonResponse({
            'data': {'token': 'access-2', 'refreshToken': 'refresh-2'},
          }),
        );

        expect(await refreshFuture, isFalse);
        expect(session.isAuthenticated, isFalse);
      },
    );
  });
}
