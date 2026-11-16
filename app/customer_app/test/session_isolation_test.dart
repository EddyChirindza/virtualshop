import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:customer_app/core/app_preferences.dart';
import 'package:customer_app/core/network/dio_client.dart';
import 'package:customer_app/core/providers.dart';
import 'package:customer_app/core/session/session_controller.dart';
import 'package:customer_app/core/storage/secure_storage_service.dart';
import 'package:customer_app/features/auth/data/auth_repository.dart';
import 'package:customer_app/features/auth/models/user.dart';
import 'package:customer_app/features/auth/providers/auth_providers.dart';
import 'package:customer_app/features/profile/data/profile_repository.dart';
import 'package:customer_app/features/profile/domain/models/profile.dart';
import 'package:customer_app/features/profile/domain/models/profile_address.dart';
import 'package:customer_app/features/profile/domain/models/profile_stats.dart';
import 'package:customer_app/features/profile/presentation/providers/profile_providers.dart';
import 'package:customer_app/features/search/data/recent_search_repository.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
  });

  group('Private data isolation', () {
    test('logout ends X session before Y can start', () async {
      FlutterSecureStorage.setMockInitialValues({
        'access_token': 'access-x',
        'refresh_token': 'refresh-x',
      });
      final storage = SecureStorageService();
      final repository = _FakeAuthRepository(storage);
      final container = ProviderContainer(
        overrides: [
          secureStorageProvider.overrideWithValue(storage),
          authRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(container.dispose);

      final userX = await container.read(authControllerProvider.future);
      expect(userX?.id, 1);
      final generationX = container.read(sessionControllerProvider).generation;
      expect(container.read(sessionControllerProvider).userId, 1);

      await container.read(authControllerProvider.notifier).logout();

      expect(container.read(authControllerProvider).valueOrNull, isNull);
      expect(container.read(sessionControllerProvider).isActive, isFalse);
      expect(await storage.getAccessToken(), isNull);
      expect(await storage.getRefreshToken(), isNull);
      expect(repository.remoteLogoutCalls, 1);
      expect(repository.lastRemoteRefreshToken, 'refresh-x');

      repository.nextUser = const User(
        id: 2,
        name: 'User Y',
        email: 'y@example.test',
      );
      await container
          .read(authControllerProvider.notifier)
          .login(identifier: 'y@example.test', password: 'Password1');

      final sessionY = container.read(sessionControllerProvider);
      expect(sessionY.userId, 2);
      expect(sessionY.generation, greaterThan(generationX));
      expect(await storage.getAccessToken(), 'access-2');
    });

    test('profile switches from user X to user Y without leaking X', () async {
      final repository = _ControllableProfileRepository(
        const Profile(id: 1, fullName: 'User X', email: 'x@example.test'),
      );
      final container = ProviderContainer(
        overrides: [profileRepositoryProvider.overrideWithValue(repository)],
      );
      addTearDown(container.dispose);
      final session = container.read(sessionControllerProvider.notifier);

      session.beginSession(1);
      final profileX = await container.read(profileProvider.future);
      expect(profileX.fullName, 'User X');

      repository.profile = const Profile(
        id: 2,
        fullName: 'User Y',
        email: 'y@example.test',
      );
      session.beginSession(2);
      final profileY = await container.read(profileProvider.future);

      expect(profileY.fullName, 'User Y');
      expect(container.read(profileProvider).valueOrNull?.fullName, 'User Y');
    });

    test('ignores a refresh response from the previous session', () async {
      final repository = _ControllableProfileRepository(
        const Profile(id: 1, fullName: 'User X', email: 'x@example.test'),
      );
      final container = ProviderContainer(
        overrides: [profileRepositoryProvider.overrideWithValue(repository)],
      );
      addTearDown(container.dispose);
      final session = container.read(sessionControllerProvider.notifier);

      session.beginSession(1);
      await container.read(profileProvider.future);
      final controller = container.read(profileProvider.notifier);

      repository.blockNextFetch = true;
      final staleRefresh = controller.refresh();
      await _pumpUntil(() => repository.pendingFetch != null);

      repository.profile = const Profile(
        id: 2,
        fullName: 'User Y',
        email: 'y@example.test',
      );
      session.beginSession(2);
      final profileY = await container.read(profileProvider.future);
      expect(profileY.fullName, 'User Y');

      repository.pendingFetch!.complete(
        const Profile(id: 1, fullName: 'User X', email: 'x@example.test'),
      );
      await staleRefresh;
      await Future<void>.delayed(Duration.zero);

      expect(container.read(profileProvider).valueOrNull?.fullName, 'User Y');
    });
  });

  group('Per-user local data', () {
    test('language and theme preferences are isolated per user', () async {
      final userX = AppPreferencesController(userId: 10);
      addTearDown(userX.dispose);
      await userX.initialized;
      await userX.setLanguage(AppLanguage.english);
      await userX.setThemeMode(ThemeMode.dark);

      final userY = AppPreferencesController(userId: 20);
      addTearDown(userY.dispose);
      await userY.initialized;
      expect(userY.state.language, AppLanguage.portuguese);
      expect(userY.state.themeMode, ThemeMode.light);

      final restoredX = AppPreferencesController(userId: 10);
      addTearDown(restoredX.dispose);
      await restoredX.initialized;
      expect(restoredX.state.language, AppLanguage.english);
      expect(restoredX.state.themeMode, ThemeMode.dark);

      final restoredY = AppPreferencesController(userId: 20);
      addTearDown(restoredY.dispose);
      await restoredY.initialized;
      expect(restoredY.state.language, AppLanguage.portuguese);
      expect(restoredY.state.themeMode, ThemeMode.light);
    });

    test('app preferences provider reloads when the session changes', () async {
      SharedPreferences.setMockInitialValues({
        'app_language_10': 'en',
        'app_language_20': 'pt',
      });
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final session = container.read(sessionControllerProvider.notifier);

      session.beginSession(10);
      final preferencesX = container.read(appPreferencesProvider.notifier);
      await preferencesX.initialized;
      expect(
        container.read(appPreferencesProvider).language,
        AppLanguage.english,
      );

      session.beginSession(20);
      final preferencesY = container.read(appPreferencesProvider.notifier);
      await preferencesY.initialized;
      expect(
        container.read(appPreferencesProvider).language,
        AppLanguage.portuguese,
      );
    });

    test('recent searches are isolated per user and guest', () async {
      final userX = RecentSearchRepository(userId: 1);
      final userY = RecentSearchRepository(userId: 2);
      final guest = RecentSearchRepository();

      await userX.add('arroz');
      await userY.add('oleo');
      await guest.add('sabao');

      expect(await userX.getAll(), ['arroz']);
      expect(await userY.getAll(), ['oleo']);
      expect(await guest.getAll(), ['sabao']);
    });
  });

  group('Session-safe token refresh', () {
    test('stale refresh cannot overwrite the new session tokens', () async {
      FlutterSecureStorage.setMockInitialValues({
        'access_token': 'access-x',
        'refresh_token': 'refresh-x',
      });
      final storage = SecureStorageService();
      final refreshCompleter = Completer<ResponseBody>();
      var refreshCalls = 0;
      var expiredCalls = 0;
      var protectedCalls = 0;
      var generation = 1;

      final refreshDio = _dioWithAdapter((_) {
        refreshCalls++;
        return refreshCompleter.future;
      });
      final dio = _dioWithAdapter((_) {
        protectedCalls++;
        if (protectedCalls == 1) {
          return Future.value(
            _jsonResponse({'message': 'unauthorized'}, status: 401),
          );
        }
        return Future.value(_jsonResponse({'ok': true}));
      });

      final client = DioClient(
        storage: storage,
        onSessionExpired: (_) => expiredCalls++,
        sessionGeneration: () => generation,
        customDio: dio,
        customRefreshDio: refreshDio,
      );

      final request = client.dio.get<dynamic>('/protected');
      await _pumpUntil(() => refreshCalls == 1);

      await storage.saveTokens(
        accessToken: 'access-y',
        refreshToken: 'refresh-y',
      );
      generation = 2;
      refreshCompleter.complete(
        _jsonResponse({
          'data': {
            'token': 'access-x-refreshed',
            'refreshToken': 'refresh-x-refreshed',
          },
        }),
      );

      await expectLater(request, throwsA(isA<DioException>()));
      expect(await storage.getAccessToken(), 'access-y');
      expect(await storage.getRefreshToken(), 'refresh-y');
      expect(expiredCalls, 0);
    });

    test(
      'stale refresh rejection cannot clear the new session tokens',
      () async {
        FlutterSecureStorage.setMockInitialValues({
          'access_token': 'access-x',
          'refresh_token': 'refresh-x',
        });
        final storage = SecureStorageService();
        final refreshCompleter = Completer<ResponseBody>();
        var refreshCalls = 0;
        var expiredCalls = 0;
        var protectedCalls = 0;
        var generation = 1;

        final refreshDio = _dioWithAdapter((_) {
          refreshCalls++;
          return refreshCompleter.future;
        });
        final dio = _dioWithAdapter((_) {
          protectedCalls++;
          if (protectedCalls == 1) {
            return Future.value(
              _jsonResponse({'message': 'unauthorized'}, status: 401),
            );
          }
          return Future.value(_jsonResponse({'ok': true}));
        });

        final client = DioClient(
          storage: storage,
          onSessionExpired: (_) => expiredCalls++,
          sessionGeneration: () => generation,
          customDio: dio,
          customRefreshDio: refreshDio,
        );

        final request = client.dio.get<dynamic>('/protected');
        await _pumpUntil(() => refreshCalls == 1);

        await storage.saveTokens(
          accessToken: 'access-y',
          refreshToken: 'refresh-y',
        );
        generation = 2;
        refreshCompleter.complete(
          _jsonResponse({'message': 'expired'}, status: 401),
        );

        await expectLater(request, throwsA(isA<DioException>()));
        expect(await storage.getAccessToken(), 'access-y');
        expect(await storage.getRefreshToken(), 'refresh-y');
        expect(expiredCalls, 0);
      },
    );

    test('network refresh failure does not clear a valid session', () async {
      FlutterSecureStorage.setMockInitialValues({
        'access_token': 'access-x',
        'refresh_token': 'refresh-x',
      });
      final storage = SecureStorageService();
      var expiredCalls = 0;
      var protectedCalls = 0;

      final refreshDio = _dioWithAdapter(
        (options) => throw DioException(
          requestOptions: options,
          type: DioExceptionType.connectionError,
        ),
      );
      final dio = _dioWithAdapter((_) {
        protectedCalls++;
        if (protectedCalls == 1) {
          return Future.value(
            _jsonResponse({'message': 'unauthorized'}, status: 401),
          );
        }
        return Future.value(_jsonResponse({'ok': true}));
      });

      final client = DioClient(
        storage: storage,
        onSessionExpired: (_) => expiredCalls++,
        sessionGeneration: () => 1,
        customDio: dio,
        customRefreshDio: refreshDio,
      );

      await expectLater(
        client.dio.get<dynamic>('/protected'),
        throwsA(isA<DioException>()),
      );
      expect(await storage.getAccessToken(), 'access-x');
      expect(await storage.getRefreshToken(), 'refresh-x');
      expect(expiredCalls, 0);
    });
  });
}

Dio _dioWithAdapter(Future<ResponseBody> Function(RequestOptions) handler) {
  return Dio(BaseOptions(baseUrl: 'https://example.test'))
    ..httpClientAdapter = _ScriptedAdapter(handler);
}

ResponseBody _jsonResponse(Object body, {int status = 200}) {
  return ResponseBody.fromString(
    jsonEncode(body),
    status,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );
}

Future<void> _pumpUntil(bool Function() condition) async {
  for (var i = 0; i < 200; i++) {
    if (condition()) return;
    await Future<void>.delayed(Duration.zero);
  }
  fail('Condition was not met in time');
}

class _ScriptedAdapter implements HttpClientAdapter {
  _ScriptedAdapter(this.handler);

  final Future<ResponseBody> Function(RequestOptions) handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) {
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}

class _FakeAuthRepository extends AuthRepository {
  _FakeAuthRepository(this.storage) : super(dio: Dio(), storage: storage);

  final SecureStorageService storage;
  User nextUser = const User(id: 1, name: 'User X', email: 'x@example.test');
  int remoteLogoutCalls = 0;
  String? lastRemoteRefreshToken;

  @override
  Future<User> fetchMe() async => nextUser;

  @override
  Future<User?> cachedUser() async => null;

  @override
  Future<User> login({
    required String identifier,
    required String password,
  }) async {
    await storage.saveTokens(
      accessToken: 'access-${nextUser.id}',
      refreshToken: 'refresh-${nextUser.id}',
    );
    return nextUser;
  }

  @override
  Future<void> logoutRemote(String? refreshToken) async {
    remoteLogoutCalls++;
    lastRemoteRefreshToken = refreshToken;
  }
}

class _ControllableProfileRepository implements ProfileRepository {
  _ControllableProfileRepository(this.profile);

  Profile profile;
  bool blockNextFetch = false;
  Completer<Profile>? pendingFetch;

  @override
  Future<Profile> fetchProfile() {
    if (blockNextFetch) {
      blockNextFetch = false;
      final completer = Completer<Profile>();
      pendingFetch = completer;
      return completer.future;
    }
    return Future.value(profile);
  }

  @override
  Future<Profile> updateProfile(Map<String, dynamic> fields) async => profile;

  @override
  Future<Profile> updateProfilePhoto(List<int> bytes) async => profile;

  @override
  Future<Profile> deleteProfilePhoto() async => profile;

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {}

  @override
  Future<ProfileStats> fetchStats() async => const ProfileStats();

  @override
  Future<List<ProfileAddress>> fetchAddresses() async => const [];

  @override
  Future<ProfileAddress> createAddress(Map<String, dynamic> fields) {
    throw UnimplementedError();
  }

  @override
  Future<ProfileAddress> updateAddress(int id, Map<String, dynamic> fields) {
    throw UnimplementedError();
  }

  @override
  Future<void> deleteAddress(int id) async {}
}
