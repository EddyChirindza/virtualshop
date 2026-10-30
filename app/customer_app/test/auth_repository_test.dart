import 'dart:convert';

import 'package:customer_app/core/constants/api_constants.dart';
import 'package:customer_app/core/errors/api_exception.dart';
import 'package:customer_app/core/storage/secure_storage_service.dart';
import 'package:customer_app/features/auth/data/auth_repository.dart';
import 'package:customer_app/features/auth/models/user.dart';
import 'package:customer_app/features/auth/providers/auth_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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

  test('caches the authenticated user for offline startup', () async {
    final dio = Dio(BaseOptions(baseUrl: 'https://example.test'))
      ..interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            handler.resolve(
              Response<dynamic>(
                requestOptions: options,
                data: {
                  'data': {
                    'user': {
                      'id': 7,
                      'full_name': 'Cached User',
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

    await repository.login(identifier: '+258841234567', password: 'Password1');

    final cached = await repository.cachedUser();
    expect(cached?.id, 7);
    expect(cached?.name, 'Cached User');
  });

  test('keeps cached user when startup fetch fails offline', () async {
    FlutterSecureStorage.setMockInitialValues({
      'access_token': 'access-token',
      'refresh_token': 'refresh-token',
    });
    final storage = SecureStorageService();
    await storage.saveCachedUser(
      jsonEncode({
        'id': 7,
        'full_name': 'Cached User',
        'phone': '+258841234567',
      }),
    );
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(
          _OfflineAuthRepository(storage: storage),
        ),
      ],
    );
    addTearDown(container.dispose);

    final user = await container.read(authControllerProvider.future);

    expect(user?.id, 7);
    expect(await storage.hasSession(), isTrue);
  });

  test('clears the session when startup fetch is unauthorized', () async {
    FlutterSecureStorage.setMockInitialValues({
      'access_token': 'access-token',
      'refresh_token': 'refresh-token',
    });
    final storage = SecureStorageService();
    await storage.saveCachedUser(
      jsonEncode({
        'id': 7,
        'full_name': 'Cached User',
        'phone': '+258841234567',
      }),
    );
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(
          _UnauthorizedAuthRepository(storage: storage),
        ),
      ],
    );
    addTearDown(container.dispose);

    final user = await container.read(authControllerProvider.future);

    expect(user, isNull);
    expect(await storage.hasSession(), isFalse);
    expect(await storage.getCachedUser(), isNull);
  });
}

class _OfflineAuthRepository extends AuthRepository {
  _OfflineAuthRepository({required super.storage}) : super(dio: Dio());

  @override
  Future<User> fetchMe() {
    throw ApiException(message: 'Sem ligação', type: ApiErrorType.network);
  }
}

class _UnauthorizedAuthRepository extends AuthRepository {
  _UnauthorizedAuthRepository({required super.storage}) : super(dio: Dio());

  @override
  Future<User> fetchMe() {
    throw ApiException(
      message: 'Sessão expirada',
      type: ApiErrorType.unauthorized,
      statusCode: 401,
    );
  }
}
