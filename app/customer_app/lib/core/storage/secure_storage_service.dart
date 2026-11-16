import 'dart:async';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Wraps flutter_secure_storage. Access/refresh tokens are only ever
/// stored here — never in SharedPreferences, never in plain files.
/// Backed by Keystore on Android and Keychain on iOS.
class SecureStorageService {
  SecureStorageService()
    : _storage = const FlutterSecureStorage(
        aOptions: AndroidOptions(encryptedSharedPreferences: true),
        iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
      );

  final FlutterSecureStorage _storage;

  static const _kAccessToken = 'access_token';
  static const _kRefreshToken = 'refresh_token';
  static const _kCachedUser = 'cached_user';

  Future<void> _pendingOperation = Future<void>.value();

  Future<T> _synchronized<T>(Future<T> Function() action) async {
    final previous = _pendingOperation;
    final gate = Completer<void>();
    _pendingOperation = gate.future;
    await previous;
    try {
      return await action();
    } finally {
      gate.complete();
    }
  }

  Future<void> _writeTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _storage.write(key: _kAccessToken, value: accessToken),
      _storage.write(key: _kRefreshToken, value: refreshToken),
    ]);
  }

  Future<void> _deleteSession() async {
    await Future.wait([
      _storage.delete(key: _kAccessToken),
      _storage.delete(key: _kRefreshToken),
      _storage.delete(key: _kCachedUser),
    ]);
  }

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) {
    return _synchronized(
      () => _writeTokens(accessToken: accessToken, refreshToken: refreshToken),
    );
  }

  Future<bool> saveTokensIf({
    required bool Function() shouldSave,
    required String accessToken,
    required String refreshToken,
  }) {
    return _synchronized(() async {
      if (!shouldSave()) return false;
      await _writeTokens(accessToken: accessToken, refreshToken: refreshToken);
      return true;
    });
  }

  Future<String?> getAccessToken() => _storage.read(key: _kAccessToken);

  Future<String?> getRefreshToken() => _storage.read(key: _kRefreshToken);

  Future<void> saveCachedUser(String json) {
    return _storage.write(key: _kCachedUser, value: json);
  }

  Future<String?> getCachedUser() => _storage.read(key: _kCachedUser);

  Future<void> clear() => _synchronized(_deleteSession);

  Future<bool> clearIf(bool Function() shouldClear) {
    return _synchronized(() async {
      if (!shouldClear()) return false;
      await _deleteSession();
      return true;
    });
  }

  Future<bool> hasSession() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }
}
