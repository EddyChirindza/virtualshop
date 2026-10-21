import 'package:customer_app/core/constants/api_constants.dart';
import 'package:customer_app/core/storage/secure_storage_service.dart';
import 'package:customer_app/features/auth/data/auth_repository.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
  });

  test(
    'sends separate required names and omits email from registration payload',
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
                  data: {
                    'data': {
                      'user': {
                        'id': 1,
                        'full_name': 'Test User',
                        'phone': '+258841234567',
                      },
                      'token': 'access-token',
                      'refreshToken': 'refresh-token',
                    },
                  },
                ),
              );
            },
          ),
        );
      final repository = AuthRepository(
        dio: dio,
        storage: SecureStorageService(),
      );

      await repository.register(
        firstName: 'Test',
        lastName: 'User',
        phone: '+258841234567',
        password: 'Password1',
      );

      expect(capturedRequest?.path, ApiConstants.register);
      expect(capturedRequest?.data, {
        'first_name': 'Test',
        'last_name': 'User',
        'full_name': 'Test User',
        'password': 'Password1',
        'phone': '+258841234567',
      });
    },
  );
}
