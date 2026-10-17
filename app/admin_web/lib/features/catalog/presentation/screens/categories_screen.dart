import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../data/catalog_repository.dart';
import '../../models/admin_product.dart';

const _ink = Color(0xFF182230);
const _muted = Color(0xFF667085);
const _line = Color(0xFFEAECF0);

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key, required this.repository});
  final CatalogRepository repository;
  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  late Future<List<AdminCategory>> _future;
  @override
  void initState() { super.initState(); _future = widget.repository.listCategories(); }
  void _load() => setState(() => _future = widget.repository.listCategories());

  Future<void> _edit([AdminCategory? category]) async {
    try {
      final categories = await widget.repository.listCategories();
      if (!mounted) return;
      final saved = await showDialog<bool>(context: context, builder: (_) => _CategoryFormDialog(repository: widget.repository, categories: categories, category: category));
      if (saved == true) _load();
    } catch (error) {
      _message(_errorText(error), error: true);
    }
  }

  Future<void> _delete(AdminCategory category) async {
    final confirmed = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
      title: const Text('Eliminar categoria?'),
      content: Text('Queres eliminar “${category.name}”? A API não permite eliminar categorias com subcategorias ou produtos associados.'),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')), FilledButton.tonal(onPressed: () => Navigator.pop(context, true), child: const Text('Eliminar'))],
    ));
    if (confirmed != true) return;
    try {
      await widget.repository.deleteCategory(category.id);
      _message('Categoria eliminada.');
      _load();
    } catch (error) {
      _message(_errorText(error), error: true);
    }
  }

  void _message(String value, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(value), backgroundColor: error ? const Color(0xFFB42318) : null));
  }

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Categorias', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: _ink)), SizedBox(height: 5), Text('Organiza categorias e subcategorias da loja.', style: TextStyle(color: _muted, fontSize: 14))])), FilledButton.icon(onPressed: () => _edit(), icon: const Icon(Icons.add), label: const Text('Adicionar categoria'))]),
        const SizedBox(height: 22),
        Expanded(child: FutureBuilder<List<AdminCategory>>(future: _future, builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) return const Center(child: CircularProgressIndicator());
          if (snapshot.hasError) return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Text(_errorText(snapshot.error!)), const SizedBox(height: 12), OutlinedButton(onPressed: _load, child: const Text('Tentar novamente'))]));
          final categories = snapshot.data!;
          if (categories.isEmpty) return const Center(child: Text('Ainda não há categorias.'));
          final byId = {for (final category in categories) category.id: category};
          return Container(decoration: BoxDecoration(color: Colors.white, border: Border.all(color: _line), borderRadius: BorderRadius.circular(12)), child: ListView(children: [
            ...categories.map((category) {
              final parent = category.parentId == null ? null : byId[category.parentId];
              return Container(padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12), decoration: const BoxDecoration(border: Border(top: BorderSide(color: _line))), child: Row(children: [
                Container(width: 42, height: 42, decoration: BoxDecoration(color: const Color(0xFFEAF0FF), borderRadius: BorderRadius.circular(10)), child: Icon(category.parentId == null ? Icons.category_outlined : Icons.subdirectory_arrow_right_rounded, color: const Color(0xFF3157D5), size: 20)),
                const SizedBox(width: 13),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(category.parentId == null ? category.name : '↳  ${category.name}', style: const TextStyle(color: _ink, fontWeight: FontWeight.w600)), const SizedBox(height: 4), Text(parent == null ? '/${category.slug}' : '${parent.name}  ·  /${category.slug}', style: const TextStyle(color: _muted, fontSize: 12))])),
                IconButton(tooltip: 'Editar', onPressed: () => _edit(category), icon: const Icon(Icons.edit_outlined, size: 19)),
                IconButton(tooltip: 'Eliminar', onPressed: () => _delete(category), icon: const Icon(Icons.delete_outline, size: 19, color: Color(0xFFB42318))),
              ]));
            }),
          ]));
        })),
      ]);
}

class _CategoryFormDialog extends StatefulWidget {
  const _CategoryFormDialog({required this.repository, required this.categories, this.category});
  final CatalogRepository repository;
  final List<AdminCategory> categories;
  final AdminCategory? category;
  @override
  State<_CategoryFormDialog> createState() => _CategoryFormDialogState();
}

class _CategoryFormDialogState extends State<_CategoryFormDialog> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _name, _slug, _icon;
  int? _parentId;
  bool _slugWasEdited = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.category?.name ?? '');
    _slug = TextEditingController(text: widget.category?.slug ?? '');
    _icon = TextEditingController(text: widget.category?.iconUrl ?? '');
    _parentId = widget.category?.parentId;
    _name.addListener(_syncSlug);
  }

  void _syncSlug() {
    if (!_slugWasEdited && widget.category == null) _slug.text = _slugify(_name.text);
  }

  @override
  void dispose() { _name.removeListener(_syncSlug); _name.dispose(); _slug.dispose(); _icon.dispose(); super.dispose(); }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _saving = true);
    final fields = <String, dynamic>{'name': _name.text.trim(), 'slug': _slug.text.trim(), 'icon_url': _icon.text.trim().isEmpty ? null : _icon.text.trim(), 'parent_id': _parentId};
    try {
      if (widget.category == null) { await widget.repository.createCategory(fields); } else { await widget.repository.updateCategory(widget.category!.id, fields); }
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_errorText(error)), backgroundColor: const Color(0xFFB42318)));
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final parents = widget.categories.where((item) => item.id != widget.category?.id).toList();
    return AlertDialog(
      title: Text(widget.category == null ? 'Adicionar categoria' : 'Editar categoria'),
      content: SizedBox(width: 460, child: Form(key: _form, child: Column(mainAxisSize: MainAxisSize.min, children: [
        TextFormField(controller: _name, decoration: const InputDecoration(labelText: 'Nome'), validator: (value) => value == null || value.trim().length < 2 ? 'Introduz um nome com pelo menos 2 caracteres.' : null),
        const SizedBox(height: 12),
        TextFormField(controller: _slug, onChanged: (_) => _slugWasEdited = true, decoration: const InputDecoration(labelText: 'Slug', helperText: 'Usado nos identificadores da categoria.'), validator: (value) => value == null || !RegExp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$').hasMatch(value) ? 'Usa letras minúsculas, números e hífen.' : null),
        const SizedBox(height: 12),
        DropdownButtonFormField<int?>(value: _parentId, decoration: const InputDecoration(labelText: 'Categoria principal'), items: [const DropdownMenuItem<int?>(value: null, child: Text('Nenhuma (categoria principal)')), ...parents.map((category) => DropdownMenuItem<int?>(value: category.id, child: Text(category.name, overflow: TextOverflow.ellipsis)))], onChanged: (value) => setState(() => _parentId = value)),
        const SizedBox(height: 12),
        TextFormField(controller: _icon, keyboardType: TextInputType.url, decoration: const InputDecoration(labelText: 'URL do ícone (opcional)')),
      ]))),
      actions: [TextButton(onPressed: _saving ? null : () => Navigator.pop(context, false), child: const Text('Cancelar')), FilledButton(onPressed: _saving ? null : _save, child: _saving ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Guardar'))],
    );
  }
}

String _slugify(String value) => value.toLowerCase().trim().replaceAll(RegExp(r'[^a-z0-9]+'), '-').replaceAll(RegExp(r'^-|-$'), '');
String _errorText(Object error) {
  if (error is DioException) {
    final body = error.response?.data;
    if (body is Map && body['message'] != null) return body['message'].toString();
    if (error.response?.statusCode == 409) return 'Não é possível eliminar esta categoria enquanto tiver produtos ou subcategorias.';
  }
  return error.toString().replaceFirst('Exception: ', '');
}
