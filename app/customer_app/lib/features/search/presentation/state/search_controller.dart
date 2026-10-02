import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/recent_search_repository.dart';
import '../../data/search_repository.dart';
import '../../domain/models/search_filters.dart';
import 'search_state.dart';

class SearchController extends StateNotifier<SearchState> {
  SearchController({
    required this.repository,
    required this.recentSearchRepository,
  }) : super(const SearchState());

  static const _pageSize = 20;

  final SearchRepository repository;
  final RecentSearchRepository recentSearchRepository;
  CancelToken? _activeCancelToken;
  int _requestGeneration = 0;

  void updateQuery(String query) {
    if (query == state.query) return;
    _cancelActiveRequest();
    state = state.copyWith(
      query: query,
      products: const [],
      page: 0,
      totalPages: 0,
      total: 0,
      isLoading: false,
      isLoadingMore: false,
      hasSearched: false,
      clearError: true,
    );
  }

  Future<void> applyFilters(SearchFilters filters) async {
    _cancelActiveRequest();
    state = state.copyWith(
      filters: filters,
      products: const [],
      page: 0,
      totalPages: 0,
      total: 0,
      hasSearched: false,
      clearError: true,
    );
    await searchFirstPage();
  }

  Future<void> searchFirstPage() async {
    if (!state.canSearch) return;
    _cancelActiveRequest();
    final generation = _requestGeneration;
    final token = CancelToken();
    _activeCancelToken = token;
    state = state.copyWith(
      isLoading: true,
      isLoadingMore: false,
      products: const [],
      page: 0,
      totalPages: 0,
      total: 0,
      hasSearched: true,
      clearError: true,
    );

    try {
      final result = await repository.search(
        query: state.query,
        filters: state.filters,
        page: 1,
        limit: _pageSize,
        cancelToken: token,
      );
      if (generation != _requestGeneration) return;
      state = state.copyWith(
        products: result.products,
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
        isLoading: false,
      );
      if (state.query.trim().length >= 2) {
        try {
          await recentSearchRepository.add(state.query);
        } on Object {
          // Falhas na persistência local não invalidam os resultados da API.
        }
      }
    } on Object catch (error) {
      if (generation == _requestGeneration && !token.isCancelled) {
        state = state.copyWith(isLoading: false, error: error);
      }
    }
  }

  Future<void> loadNextPage() async {
    if (!state.hasMore ||
        state.isLoading ||
        state.isLoadingMore ||
        !state.canSearch) {
      return;
    }
    final generation = _requestGeneration;
    final token = CancelToken();
    _activeCancelToken = token;
    final nextPage = state.page + 1;
    state = state.copyWith(isLoadingMore: true, clearError: true);

    try {
      final result = await repository.search(
        query: state.query,
        filters: state.filters,
        page: nextPage,
        limit: _pageSize,
        cancelToken: token,
      );
      if (generation != _requestGeneration) return;
      final existingIds = state.products.map((product) => product.id).toSet();
      final newProducts = result.products
          .where((product) => existingIds.add(product.id))
          .toList();
      state = state.copyWith(
        products: [...state.products, ...newProducts],
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
        isLoadingMore: false,
      );
    } on Object catch (error) {
      if (generation == _requestGeneration && !token.isCancelled) {
        state = state.copyWith(isLoadingMore: false, error: error);
      }
    }
  }

  void _cancelActiveRequest() {
    _requestGeneration++;
    _activeCancelToken?.cancel('Pesquisa atualizada');
    _activeCancelToken = null;
  }

  @override
  void dispose() {
    _cancelActiveRequest();
    super.dispose();
  }
}
