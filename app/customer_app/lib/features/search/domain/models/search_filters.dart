class SearchFilters {
  const SearchFilters({
    this.categoryId,
    this.minPrice,
    this.maxPrice,
    this.sort = SearchSort.relevance,
  });

  final int? categoryId;
  final double? minPrice;
  final double? maxPrice;
  final SearchSort sort;

  bool get hasActiveFilters =>
      categoryId != null ||
      minPrice != null ||
      maxPrice != null ||
      sort != SearchSort.relevance;

  SearchFilters copyWith({
    int? categoryId,
    bool clearCategory = false,
    double? minPrice,
    bool clearMinPrice = false,
    double? maxPrice,
    bool clearMaxPrice = false,
    SearchSort? sort,
  }) {
    return SearchFilters(
      categoryId: clearCategory ? null : categoryId ?? this.categoryId,
      minPrice: clearMinPrice ? null : minPrice ?? this.minPrice,
      maxPrice: clearMaxPrice ? null : maxPrice ?? this.maxPrice,
      sort: sort ?? this.sort,
    );
  }
}

enum SearchSort {
  relevance('relevance', 'Relevância'),
  priceAscending('price_asc', 'Preço crescente'),
  priceDescending('price_desc', 'Preço decrescente'),
  newest('newest', 'Mais recentes');

  const SearchSort(this.apiValue, this.label);

  final String apiValue;
  final String label;
}
