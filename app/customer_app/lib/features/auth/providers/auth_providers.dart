import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/session/session_controller.dart';
import '../data/auth_repository.dart';
import '../models/user.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    dio: ref.watch(dioProvider),
    storage: ref.watch(secureStorageProvider),
  );
});

/// Holds the current session: null while unauthenticated, a [User]
/// once logged in.
///
/// IMPORTANTE: o estado "loading" só existe no arranque (a restaurar a sessão
/// guardada). login/register NÃO passam o estado para loading — se o fizessem,
/// o AuthGate trocava o LoginScreen por um spinner a meio do pedido, o ecrã
/// era destruído e o erro (ex: "Credenciais inválidas") nunca aparecia.
/// O "a carregar" do botão vive no próprio ecrã, e os erros são lançados
/// (ApiException) para o ecrã os mostrar.
class AuthController extends AsyncNotifier<User?> {
  @override
  Future<User?> build() async {
    ref.listen(sessionControllerProvider, (previous, next) {
      if (next.userId == null && state.valueOrNull != null) {
        state = const AsyncData(null);
      }
    });

    final storage = ref.watch(secureStorageProvider);
    if (!await storage.hasSession()) {
      ref.read(sessionControllerProvider.notifier).endSession();
      return null;
    }

    final repository = ref.read(authRepositoryProvider);
    final cachedUser = await repository.cachedUser();
    try {
      final user = await repository.fetchMe();
      ref.read(sessionControllerProvider.notifier).beginSession(user.id);
      return user;
    } on ApiException catch (e) {
      // Só apaga a sessão se o servidor rejeitou os tokens. Sem rede usamos o
      // último utilizador guardado, para não desautenticar quem está offline.
      if (e.type == ApiErrorType.unauthorized) {
        await storage.clear();
        ref.read(sessionControllerProvider.notifier).endSession();
        return null;
      }
      if (cachedUser != null) {
        ref
            .read(sessionControllerProvider.notifier)
            .beginSession(cachedUser.id);
      }
      return cachedUser;
    } catch (_) {
      if (cachedUser != null) {
        ref
            .read(sessionControllerProvider.notifier)
            .beginSession(cachedUser.id);
      }
      return cachedUser;
    }
  }

  /// Lança [ApiException] se falhar.
  Future<void> login({
    required String identifier,
    required String password,
  }) async {
    final user = await ref
        .read(authRepositoryProvider)
        .login(identifier: identifier, password: password);
    ref.read(sessionControllerProvider.notifier).beginSession(user.id);
    state = AsyncData(user);
  }

  /// Lança [ApiException] se falhar.
  Future<void> register({
    required String firstName,
    required String lastName,
    required String password,
    required String phone,
  }) async {
    final user = await ref
        .read(authRepositoryProvider)
        .register(
          firstName: firstName,
          lastName: lastName,
          password: password,
          phone: phone,
        );
    ref.read(sessionControllerProvider.notifier).beginSession(user.id);
    state = AsyncData(user);
  }

  Future<void> logout() async {
    final repository = ref.read(authRepositoryProvider);
    final storage = ref.read(secureStorageProvider);
    final generation = ref.read(sessionControllerProvider).generation;
    final refreshToken = await storage.getRefreshToken();
    if (ref.read(sessionControllerProvider).generation != generation) return;

    final cleared = await storage.clearIf(
      () => ref.read(sessionControllerProvider).generation == generation,
    );
    if (!cleared) return;

    state = const AsyncData(null);
    ref
        .read(sessionControllerProvider.notifier)
        .endSession(expectedGeneration: generation);
    await repository.logoutRemote(refreshToken);
  }
}

final authControllerProvider = AsyncNotifierProvider<AuthController, User?>(
  AuthController.new,
);
