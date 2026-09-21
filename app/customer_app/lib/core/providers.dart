import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'network/dio_client.dart';
import 'storage/secure_storage_service.dart';

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

/// Bumped whenever the session expires, so any UI listening to it
/// (e.g. a router redirect) can react and send the user to /login.
final sessionExpiredProvider = StateProvider<int>((ref) => 0);

final dioClientProvider = Provider<DioClient>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return DioClient(
    storage: storage,
    onSessionExpired: () {
      ref.read(sessionExpiredProvider.notifier).state++;
    },
  );
});

final dioProvider = Provider<Dio>((ref) {
  return ref.watch(dioClientProvider).dio;
});
