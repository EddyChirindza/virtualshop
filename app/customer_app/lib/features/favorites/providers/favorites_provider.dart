import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../core/session/session_controller.dart';
import '../../auth/providers/auth_providers.dart';
import '../../products/models/product.dart';
import '../data/favorites_repository.dart';
import '../models/favorite.dart';

final favoritesRepositoryProvider = Provider<FavoritesRepository>((ref) {
  return FavoritesRepository(dio: ref.watch(dioProvider));
});

final favoritesProvider =
    AsyncNotifierProvider<FavoritesController, List<Favorite>>(
      FavoritesController.new,
    );

class FavoritesController extends AsyncNotifier<List<Favorite>> {
  @override
  Future<List<Favorite>> build() async {
    final auth = ref.watch(authControllerProvider);
    final session = ref.watch(sessionControllerProvider);
    if (auth.valueOrNull == null) return const <Favorite>[];
    if (!session.isActive) return const <Favorite>[];

    final generation = session.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    final favorites = await ref.read(favoritesRepositoryProvider).list();
    if (!sessionController.isCurrent(generation)) return const <Favorite>[];
    return favorites;
  }

  bool isFavorite(int productId) {
    return state.valueOrNull?.any(
          (favorite) => favorite.product.id == productId,
        ) ??
        false;
  }

  bool get isAuthenticated =>
      ref.read(authControllerProvider).valueOrNull != null;

  Future<bool> toggleFavorite(Product product) async {
    if (ref.read(authControllerProvider).valueOrNull == null) return false;
    final session = ref.read(sessionControllerProvider);
    if (!session.isActive) return false;
    final generation = session.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);

    final previous = state.valueOrNull ?? const <Favorite>[];
    final alreadyFavorite = previous.any(
      (favorite) => favorite.product.id == product.id,
    );
    final updated = alreadyFavorite
        ? previous
              .where((favorite) => favorite.product.id != product.id)
              .toList()
        : [...previous, Favorite(product: product)];
    state = AsyncData(updated);

    try {
      if (alreadyFavorite) {
        await ref.read(favoritesRepositoryProvider).remove(product.id);
      } else {
        await ref.read(favoritesRepositoryProvider).add(product.id);
      }
      return true;
    } catch (error, stackTrace) {
      if (!sessionController.isCurrent(generation)) return false;
      state = AsyncError<List<Favorite>>(
        error,
        stackTrace,
      ).copyWithPrevious(AsyncData(previous));
      return false;
    }
  }

  Future<void> reload() async {
    final session = ref.read(sessionControllerProvider);
    if (!session.isActive) {
      state = const AsyncData(<Favorite>[]);
      return;
    }
    final generation = session.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    state = const AsyncLoading();
    final result = await AsyncValue.guard(
      () => ref.read(favoritesRepositoryProvider).list(),
    );
    if (!sessionController.isCurrent(generation)) return;
    state = result;
  }
}
