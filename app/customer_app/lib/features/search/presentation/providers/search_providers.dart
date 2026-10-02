import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/providers.dart';
import '../../data/recent_search_repository.dart';
import '../../data/search_repository.dart';
import '../state/search_controller.dart';
import '../state/search_state.dart';

final searchRepositoryProvider = Provider<SearchRepository>((ref) {
  return SearchRepository(dio: ref.watch(dioProvider));
});

final recentSearchRepositoryProvider = Provider<RecentSearchRepository>((ref) {
  return RecentSearchRepository();
});

final recentSearchesProvider = FutureProvider<List<String>>((ref) {
  return ref.watch(recentSearchRepositoryProvider).getAll();
});

final searchControllerProvider =
    StateNotifierProvider<SearchController, SearchState>((ref) {
      return SearchController(
        repository: ref.watch(searchRepositoryProvider),
        recentSearchRepository: ref.watch(recentSearchRepositoryProvider),
      );
    });
