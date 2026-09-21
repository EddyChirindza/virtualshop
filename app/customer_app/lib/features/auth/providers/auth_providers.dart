import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/providers.dart';
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
    // React to a forced logout triggered by the Dio interceptor
    // (refresh token rejected somewhere in the app).
    ref.listen(sessionExpiredProvider, (previous, next) {
      if (previous != null && next != previous) {
        state = const AsyncData(null);
      }
    });

    final storage = ref.watch(secureStorageProvider);
    if (!await storage.hasSession()) return null;

    try {
      return await ref.read(authRepositoryProvider).fetchMe();
    } on ApiException catch (e) {
      // Só apaga os tokens se o servidor os rejeitou de facto. Se for apenas
      // falta de rede no arranque, mantém-nos — não faz sentido "deslogar"
      // alguém por estar sem internet.
      if (e.type == ApiErrorType.unauthorized) await storage.clear();
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Lança [ApiException] se falhar.
  Future<void> login({required String identifier, required String password}) async {
    final user = await ref
        .read(authRepositoryProvider)
        .login(identifier: identifier, password: password);
    state = AsyncData(user);
  }

  /// Lança [ApiException] se falhar.
  Future<void> register({
    required String name,
    required String email,
    required String password,
    required String phone,
  }) async {
    final user = await ref.read(authRepositoryProvider).register(
          name: name,
          email: email,
          password: password,
          phone: phone,
        );
    state = AsyncData(user);
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncData(null);
  }
}

final authControllerProvider =
    AsyncNotifierProvider<AuthController, User?>(AuthController.new);
