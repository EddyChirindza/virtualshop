import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_text.dart';
import '../../../../core/errors/api_exception.dart';
import '../../../products/screens/product_detail_screen.dart';
import '../../../products/widgets/product_card.dart';
import '../../../categories/models/category.dart';
import '../../../categories/providers/category_providers.dart';
import '../../domain/models/search_filters.dart';
import '../providers/search_providers.dart';
import '../state/search_state.dart';
import '../widgets/search_filters_sheet.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _textController = TextEditingController();
  final _scrollController = ScrollController();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_loadNextPageWhenNearEnd);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _textController.dispose();
    _scrollController
      ..removeListener(_loadNextPageWhenNearEnd)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(searchControllerProvider);
    ref.listen<SearchState>(searchControllerProvider, (previous, next) {
      if ((previous?.isLoading ?? false) &&
          !next.isLoading &&
          next.error == null &&
          next.query.trim().length >= 2) {
        ref.invalidate(recentSearchesProvider);
      }
    });
    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    textInputAction: TextInputAction.search,
                    onChanged: _onQueryChanged,
                    onSubmitted: (_) => _runSearchNow(),
                    decoration: InputDecoration(
                      hintText: appText(
                        context,
                        'Pesquisar produtos',
                        'Search products',
                      ),
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _textController.text.isEmpty
                          ? null
                          : IconButton(
                              tooltip: appText(
                                context,
                                'Limpar pesquisa',
                                'Clear search',
                              ),
                              onPressed: _clearQuery,
                              icon: const Icon(Icons.close),
                            ),
                      filled: true,
                      fillColor: const Color(0xFFF3F1F2),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                _FilterButton(
                  count: _activeFilterCount(state.filters),
                  onPressed: () => _openFilters(state),
                ),
              ],
            ),
          ),
          Expanded(child: _buildContent(state)),
        ],
      ),
    );
  }

  Widget _buildContent(SearchState state) {
    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.error != null) {
      final message = state.error is ApiException
          ? (state.error! as ApiException).message
          : appText(
              context,
              'Não foi possível pesquisar produtos.',
              'Could not search products.',
            );
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(message, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _runSearchNow,
                icon: const Icon(Icons.refresh),
                label: Text(appText(context, 'Tentar novamente', 'Try again')),
              ),
            ],
          ),
        ),
      );
    }
    if (state.hasSearched && state.products.isEmpty) {
      final query = state.query.trim();
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            query.isEmpty
                ? appText(
                    context,
                    'Nenhum produto encontrado com estes filtros.',
                    'No products found with these filters.',
                  )
                : appText(
                    context,
                    'Nenhum produto encontrado para \'$query\'.',
                    'No products found for \'$query\'.',
                  ),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }
    if (state.products.isNotEmpty) return _buildProductGrid(state);
    if (state.query.trim().length == 1) {
      return Center(
        child: Text(
          appText(
            context,
            'Escreve pelo menos 2 caracteres para pesquisar.',
            'Enter at least 2 characters to search.',
          ),
        ),
      );
    }
    return _buildDiscoveryContent();
  }

  Widget _buildProductGrid(SearchState state) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 1100
            ? 4
            : constraints.maxWidth >= 720
            ? 3
            : 2;
        return GridView.builder(
          controller: _scrollController,
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            childAspectRatio: 0.7,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
          itemCount: state.products.length + (state.isLoadingMore ? 1 : 0),
          itemBuilder: (context, index) {
            if (index >= state.products.length) {
              return const Center(child: CircularProgressIndicator());
            }
            final product = state.products[index];
            return ProductCard(
              product: product,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => ProductDetailScreen(productId: product.id),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildDiscoveryContent() {
    final recent = ref.watch(recentSearchesProvider);
    final categories = ref.watch(categoryTreeProvider);
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      children: [
        recent.when(
          loading: () => const SizedBox.shrink(),
          error: (error, stackTrace) => const SizedBox.shrink(),
          data: (items) => items.isEmpty
              ? const SizedBox.shrink()
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            appText(
                              context,
                              'Pesquisas recentes',
                              'Recent searches',
                            ),
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ),
                        TextButton(
                          onPressed: _clearRecentSearches,
                          child: Text(
                            appText(context, 'Apagar todas', 'Clear all'),
                          ),
                        ),
                      ],
                    ),
                    for (final query in items)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.history),
                        title: Text(query),
                        trailing: IconButton(
                          tooltip: appText(
                            context,
                            'Apagar pesquisa',
                            'Remove search',
                          ),
                          onPressed: () => _removeRecentSearch(query),
                          icon: const Icon(Icons.close),
                        ),
                        onTap: () => _selectRecentSearch(query),
                      ),
                    const SizedBox(height: 20),
                  ],
                ),
        ),
        Text(
          appText(context, 'Explorar categorias', 'Browse categories'),
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 12),
        categories.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(20),
            child: Center(child: CircularProgressIndicator()),
          ),
          error: (error, stackTrace) => TextButton.icon(
            onPressed: () => ref.invalidate(categoryTreeProvider),
            icon: const Icon(Icons.refresh),
            label: Text(
              appText(
                context,
                'Não foi possível carregar categorias. Tentar novamente',
                'Could not load categories. Try again',
              ),
            ),
          ),
          data: (items) => Column(
            children: [
              for (final category in items)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.category_outlined),
                  title: Text(category.name),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _selectCategory(category),
                ),
            ],
          ),
        ),
      ],
    );
  }

  void _onQueryChanged(String query) {
    ref.read(searchControllerProvider.notifier).updateQuery(query);
    _debounce?.cancel();
    if (query.trim().length < 2) return;
    _debounce = Timer(const Duration(milliseconds: 400), _runSearchNow);
    setState(() {});
  }

  void _runSearchNow() {
    _debounce?.cancel();
    ref.read(searchControllerProvider.notifier).searchFirstPage();
  }

  void _clearQuery() {
    _debounce?.cancel();
    _textController.clear();
    final controller = ref.read(searchControllerProvider.notifier);
    controller.updateQuery('');
    setState(() {});
    if (ref.read(searchControllerProvider).filters.hasActiveFilters) {
      controller.searchFirstPage();
    }
  }

  void _loadNextPageWhenNearEnd() {
    if (_scrollController.hasClients &&
        _scrollController.position.extentAfter < 500) {
      ref.read(searchControllerProvider.notifier).loadNextPage();
    }
  }

  Future<void> _openFilters(SearchState state) async {
    _debounce?.cancel();
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => SearchFiltersSheet(
        initialFilters: state.filters,
        onApply: (filters) =>
            ref.read(searchControllerProvider.notifier).applyFilters(filters),
      ),
    );
  }

  Future<void> _selectRecentSearch(String query) async {
    _textController.text = query;
    ref.read(searchControllerProvider.notifier).updateQuery(query);
    await ref.read(searchControllerProvider.notifier).searchFirstPage();
    ref.invalidate(recentSearchesProvider);
  }

  Future<void> _selectCategory(Category category) async {
    await ref
        .read(searchControllerProvider.notifier)
        .applyFilters(
          ref
              .read(searchControllerProvider)
              .filters
              .copyWith(
                categoryId: category.id,
                clearMinPrice: true,
                clearMaxPrice: true,
              ),
        );
  }

  Future<void> _removeRecentSearch(String query) async {
    await ref.read(recentSearchRepositoryProvider).remove(query);
    ref.invalidate(recentSearchesProvider);
  }

  Future<void> _clearRecentSearches() async {
    await ref.read(recentSearchRepositoryProvider).clear();
    ref.invalidate(recentSearchesProvider);
  }

  int _activeFilterCount(SearchFilters filters) =>
      (filters.categoryId == null ? 0 : 1) +
      (filters.minPrice == null ? 0 : 1) +
      (filters.maxPrice == null ? 0 : 1) +
      (filters.sort == SearchSort.relevance ? 0 : 1);
}

class _FilterButton extends StatelessWidget {
  const _FilterButton({required this.count, required this.onPressed});

  final int count;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return IconButton.filledTonal(
      tooltip: appText(context, 'Filtros e ordenação', 'Filters and sorting'),
      onPressed: onPressed,
      icon: Badge(
        isLabelVisible: count > 0,
        label: Text('$count'),
        child: const Icon(Icons.tune),
      ),
    );
  }
}
