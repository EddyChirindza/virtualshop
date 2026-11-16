import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'network/dio_client.dart';
import 'session/session_controller.dart';
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
    sessionGeneration: () => ref.read(sessionControllerProvider).generation,
    onSessionExpired: (generation) {
      final session = ref.read(sessionControllerProvider);
      if (!session.isCurrent(generation)) return;
      ref
          .read(sessionControllerProvider.notifier)
          .endSession(expectedGeneration: generation);
      ref.read(sessionExpiredProvider.notifier).state++;
    },
  );
});

final dioProvider = Provider<Dio>((ref) {
  return ref.watch(dioClientProvider).dio;
});
