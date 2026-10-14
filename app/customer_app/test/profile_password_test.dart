import 'package:customer_app/core/constants/api_constants.dart';
import 'package:customer_app/features/profile/data/profile_repository.dart';
import 'package:customer_app/features/profile/presentation/screens/change_password_screen.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'sends current and new passwords to the authenticated endpoint',
    () async {
      RequestOptions? capturedRequest;
      final dio = Dio(BaseOptions(baseUrl: 'https://example.test'))
        ..interceptors.add(
          InterceptorsWrapper(
            onRequest: (options, handler) {
              capturedRequest = options;
              handler.resolve(
                Response<dynamic>(
                  requestOptions: options,
                  data: {'success': true},
                ),
              );
            },
          ),
        );
      final repository = ProfileRepository(dio: dio);

      await repository.changePassword(
        currentPassword: 'OldPassword1',
        newPassword: 'NewPassword2',
      );

      expect(capturedRequest?.method, 'PATCH');
      expect(capturedRequest?.path, ApiConstants.userPassword);
      expect(capturedRequest?.data, {
        'currentPassword': 'OldPassword1',
        'newPassword': 'NewPassword2',
      });
    },
  );

  testWidgets('rejects a confirmation that does not match the new password', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(child: MaterialApp(home: ChangePasswordScreen())),
    );

    await tester.enterText(
      find.byType(TextFormField).at(0),
      'CurrentPassword1',
    );
    await tester.enterText(find.byType(TextFormField).at(1), 'NewPassword2');
    await tester.enterText(
      find.byType(TextFormField).at(2),
      'DifferentPassword3',
    );
    await tester.tap(find.text('Save new password'));
    await tester.pump();

    expect(find.text('Passwords do not match.'), findsOneWidget);
  });
}
