import '../../../products/models/product.dart';
import '../../domain/models/search_filters.dart';

class SearchState {
  const SearchState({
    this.query = '',
    this.filters = const SearchFilters(),
    this.products = const [],
    this.page = 0,
    this.totalPages = 0,
    this.total = 0,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.hasSearched = false,
    this.error,
  });

  final String query;
  final SearchFilters filters;
  final List<Product> products;
  final int page;
  final int totalPages;
  final int total;
  final bool isLoading;
  final bool isLoadingMore;
  final bool hasSearched;
  final Object? error;

  bool get canSearch => query.trim().length >= 2 || filters.hasActiveFilters;
  bool get hasMore => page < totalPages;

  SearchState copyWith({
    String? query,
    SearchFilters? filters,
    List<Product>? products,
    int? page,
    int? totalPages,
    int? total,
    bool? isLoading,
    bool? isLoadingMore,
    bool? hasSearched,
    Object? error,
    bool clearError = false,
  }) {
    return SearchState(
      query: query ?? this.query,
      filters: filters ?? this.filters,
      products: products ?? this.products,
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      total: total ?? this.total,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasSearched: hasSearched ?? this.hasSearched,
      error: clearError ? null : error ?? this.error,
    );
  }
}
