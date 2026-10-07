import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_text.dart';
import '../../../categories/models/category.dart';
import '../../../categories/providers/category_providers.dart';
import '../../domain/models/search_filters.dart';

class SearchFiltersSheet extends ConsumerStatefulWidget {
  const SearchFiltersSheet({
    required this.initialFilters,
    required this.onApply,
    super.key,
  });

  final SearchFilters initialFilters;
  final ValueChanged<SearchFilters> onApply;

  @override
  ConsumerState<SearchFiltersSheet> createState() => _SearchFiltersSheetState();
}

class _SearchFiltersSheetState extends ConsumerState<SearchFiltersSheet> {
  late int? _categoryId = widget.initialFilters.categoryId;
  late SearchSort _sort = widget.initialFilters.sort;
  late final TextEditingController _minimumController = TextEditingController(
    text: widget.initialFilters.minPrice?.toString() ?? '',
  );
  late final TextEditingController _maximumController = TextEditingController(
    text: widget.initialFilters.maxPrice?.toString() ?? '',
  );

  @override
  void dispose() {
    _minimumController.dispose();
    _maximumController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(categoryTreeProvider);
    final options = categories.valueOrNull == null
        ? const <Category>[]
        : _flatten(categories.valueOrNull!);
    final selectedCategory =
        options.any((category) => category.id == _categoryId)
        ? _categoryId
        : null;

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          12,
          20,
          20 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      appText(context, 'Filtros', 'Filters'),
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  IconButton(
                    tooltip: appText(
                      context,
                      'Fechar filtros',
                      'Close filters',
                    ),
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<int?>(
                initialValue: selectedCategory,
                decoration: InputDecoration(
                  labelText: appText(context, 'Categoria', 'Category'),
                  border: OutlineInputBorder(),
                ),
                items: [
                  DropdownMenuItem<int?>(
                    value: null,
                    child: Text(appText(context, 'Todas', 'All')),
                  ),
                  for (final category in options)
                    DropdownMenuItem<int?>(
                      value: category.id,
                      child: Text(category.name),
                    ),
                ],
                onChanged: (value) => setState(() => _categoryId = value),
              ),
              const SizedBox(height: 16),
              Text(
                appText(context, 'Intervalo de preço', 'Price range'),
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _minimumController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: InputDecoration(
                        labelText: appText(context, 'Mínimo', 'Minimum'),
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _maximumController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: InputDecoration(
                        labelText: appText(context, 'Máximo', 'Maximum'),
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<SearchSort>(
                initialValue: _sort,
                decoration: InputDecoration(
                  labelText: appText(context, 'Ordenar por', 'Sort by'),
                  border: OutlineInputBorder(),
                ),
                items: [
                  for (final sort in SearchSort.values)
                    DropdownMenuItem(
                      value: sort,
                      child: Text(
                        appText(context, sort.label, sort.englishLabel),
                      ),
                    ),
                ],
                onChanged: (value) {
                  if (value != null) setState(() => _sort = value);
                },
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  TextButton(
                    onPressed: _clear,
                    child: Text(appText(context, 'Limpar', 'Clear')),
                  ),
                  const Spacer(),
                  FilledButton(
                    onPressed: _apply,
                    child: Text(appText(context, 'Aplicar', 'Apply')),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Category> _flatten(List<Category> roots) => [
    for (final category in roots) ...[category, ..._flatten(category.children)],
  ];

  void _clear() {
    _minimumController.clear();
    _maximumController.clear();
    setState(() {
      _categoryId = null;
      _sort = SearchSort.relevance;
    });
    widget.onApply(const SearchFilters());
    Navigator.of(context).pop();
  }

  void _apply() {
    final minimumText = _minimumController.text.trim();
    final maximumText = _maximumController.text.trim();
    final minimum = double.tryParse(minimumText);
    final maximum = double.tryParse(maximumText);
    if ((minimumText.isNotEmpty && (minimum == null || minimum < 0)) ||
        (maximumText.isNotEmpty && (maximum == null || maximum < 0))) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            appText(
              context,
              'Introduz preços válidos e não negativos.',
              'Enter valid, non-negative prices.',
            ),
          ),
        ),
      );
      return;
    }
    if (minimum != null && maximum != null && minimum > maximum) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            appText(
              context,
              'O preço mínimo não pode exceder o máximo.',
              'The minimum price cannot exceed the maximum.',
            ),
          ),
        ),
      );
      return;
    }

    widget.onApply(
      SearchFilters(
        categoryId: _categoryId,
        minPrice: minimum,
        maxPrice: maximum,
        sort: _sort,
      ),
    );
    Navigator.of(context).pop();
  }
}
