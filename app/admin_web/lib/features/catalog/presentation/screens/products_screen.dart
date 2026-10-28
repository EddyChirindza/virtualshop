import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/constants/api_constants.dart';
import '../../data/catalog_repository.dart';
import '../../models/admin_product.dart';

const _blue = Color(0xFF3157D5);
const _ink = Color(0xFF182230);
const _muted = Color(0xFF667085);
const _line = Color(0xFFEAECF0);

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key, required this.repository});
  final CatalogRepository repository;

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final _search = TextEditingController();
  late Future<AdminProductPage> _future;
  var _page = 1;
  var _busy = false;

  @override
  void initState() {
    super.initState();
    _future = widget.repository.listProducts();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _load() => setState(() => _future = widget.repository.listProducts(page: _page, search: _search.text));

  Future<void> _edit([AdminProduct? product]) async {
    try {
      final categories = await widget.repository.listCategories();
      if (!mounted) return;
      final saved = await showDialog<bool>(
        context: context,
        builder: (_) => _ProductFormDialog(repository: widget.repository, categories: categories, product: product),
      );
      if (saved == true) _load();
    } catch (error) {
      _notice(_errorText(error), isError: true);
    }
  }

  Future<void> _delete(AdminProduct product) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar produto?'),
        content: Text('“${product.name}” deixará de aparecer no catálogo. Produtos incluídos em encomendas anteriores não podem ser eliminados.'),
        actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')), FilledButton.tonal(onPressed: () => Navigator.pop(context, true), child: const Text('Eliminar'))],
      ),
    );
    if (confirmed != true) return;
    setState(() => _busy = true);
    try {
      await widget.repository.deleteProduct(product.id);
      _notice('Produto eliminado.');
      _load();
    } catch (error) {
      _notice(_errorText(error), isError: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _notice(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), backgroundColor: isError ? const Color(0xFFB42318) : null));
  }

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Produtos', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: _ink)), SizedBox(height: 5), Text('Gerir o catálogo que aparece na loja do cliente.', style: TextStyle(color: _muted, fontSize: 14))])), FilledButton.icon(onPressed: () => _edit(), icon: const Icon(Icons.add), label: const Text('Adicionar produto'))]),
        const SizedBox(height: 22),
        TextField(controller: _search, onSubmitted: (_) { _page = 1; _load(); }, decoration: InputDecoration(hintText: 'Pesquisar produtos', prefixIcon: const Icon(Icons.search), suffixIcon: IconButton(onPressed: () { _search.clear(); _page = 1; _load(); }, icon: const Icon(Icons.close)), filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _line)), enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _line)))),
        const SizedBox(height: 16),
        Expanded(child: FutureBuilder<AdminProductPage>(future: _future, builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) return const Center(child: CircularProgressIndicator());
          if (snapshot.hasError) return _CatalogError(message: _errorText(snapshot.error!), onRetry: _load);
          final result = snapshot.data!;
          if (result.items.isEmpty) return const _EmptyCatalog(message: 'Nenhum produto encontrado.');
          return Column(children: [
            Expanded(child: Container(decoration: BoxDecoration(color: Colors.white, border: Border.all(color: _line), borderRadius: BorderRadius.circular(12)), child: ListView(children: [
              if (MediaQuery.sizeOf(context).width > 740) const Padding(padding: EdgeInsets.fromLTRB(16, 15, 16, 10), child: Row(children: [SizedBox(width: 58), Expanded(flex: 4, child: _ColumnLabel('PRODUTO')), Expanded(flex: 2, child: _ColumnLabel('CATEGORIA')), Expanded(child: _ColumnLabel('PREÇO')), Expanded(flex: 2, child: _ColumnLabel('DISPONIBILIDADE')), SizedBox(width: 88)])),
              ...result.items.map((product) => _ProductRow(product: product, onEdit: () => _edit(product), onDelete: () => _delete(product))),
              if (_busy) const LinearProgressIndicator(minHeight: 2),
            ]))),
            const SizedBox(height: 12),
            Row(children: [Text('${result.total} produtos', style: const TextStyle(color: _muted, fontSize: 13)), const Spacer(), IconButton(onPressed: result.page > 1 ? () { _page--; _load(); } : null, icon: const Icon(Icons.chevron_left)), Text('${result.page} / ${result.totalPages}', style: const TextStyle(color: _muted)), IconButton(onPressed: result.page < result.totalPages ? () { _page++; _load(); } : null, icon: const Icon(Icons.chevron_right))]),
          ]);
        })),
      ]);
}

class _ProductRow extends StatelessWidget {
  const _ProductRow({required this.product, required this.onEdit, required this.onDelete});
  final AdminProduct product;
  final VoidCallback onEdit, onDelete;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12), decoration: const BoxDecoration(border: Border(top: BorderSide(color: _line))), child: Row(children: [
        ClipRRect(borderRadius: BorderRadius.circular(9), child: SizedBox(width: 46, height: 46, child: product.imageUrl == null || product.imageUrl!.isEmpty ? const ColoredBox(color: Color(0xFFF2F4F7), child: Icon(Icons.image_outlined, color: _muted)) : Image.network(ApiConstants.resolveImageUrl(product.imageUrl!), fit: BoxFit.cover, errorBuilder: (_, __, ___) => const ColoredBox(color: Color(0xFFF2F4F7), child: Icon(Icons.broken_image_outlined, color: _muted))))),
        const SizedBox(width: 12),
        Expanded(flex: 4, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: _ink, fontWeight: FontWeight.w600, fontSize: 13)), const SizedBox(height: 4), Text('#${product.id}${product.isNewArrival ? ' · Novidade' : ''}${product.isPopular ? ' · Popular' : ''}', style: const TextStyle(color: _muted, fontSize: 11))])),
        Expanded(flex: 2, child: Text(product.categoryName ?? 'Sem categoria', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: _muted, fontSize: 12))),
        Expanded(child: Text('MZN ${product.price.toStringAsFixed(2)}', style: const TextStyle(color: _ink, fontSize: 12, fontWeight: FontWeight.w600))),
        Expanded(flex: 2, child: _StockStatusChip(status: product.availability)),
        SizedBox(width: 88, child: Row(mainAxisAlignment: MainAxisAlignment.end, children: [IconButton(tooltip: 'Editar', onPressed: onEdit, icon: const Icon(Icons.edit_outlined, size: 18)), IconButton(tooltip: 'Eliminar', onPressed: onDelete, icon: const Icon(Icons.delete_outline, size: 18, color: Color(0xFFB42318)))])),
      ]));
}

class _ProductFormDialog extends StatefulWidget {
  const _ProductFormDialog({required this.repository, required this.categories, this.product});
  final CatalogRepository repository;
  final List<AdminCategory> categories;
  final AdminProduct? product;
  @override
  State<_ProductFormDialog> createState() => _ProductFormDialogState();
}

class _ProductFormDialogState extends State<_ProductFormDialog> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _name, _description, _price;
  int? _categoryId;
  String _stockStatus = 'in_stock';
  late List<String> _imageUrls;
  final List<Uint8List> _pickedImageBytes = [];
  late bool _popular, _newArrival;
  var _notifyCustomers = false;
  String? _notificationMessage;
  var _saving = false;

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    _name = TextEditingController(text: p?.name ?? '');
    _description = TextEditingController(text: p?.description ?? '');
    _price = TextEditingController(text: p?.price.toStringAsFixed(2) ?? '');
    _stockStatus = p?.availability ?? 'in_stock';
    _imageUrls = List<String>.from(
      p?.imageUrls.isNotEmpty == true
          ? p!.imageUrls
          : (p?.imageUrl?.isNotEmpty == true ? [p!.imageUrl!] : const []),
    );
    _categoryId = p?.categoryId;
    _popular = p?.isPopular ?? false;
    _newArrival = p?.isNewArrival ?? true;
  }

  @override
  void dispose() { _name.dispose(); _description.dispose(); _price.dispose(); super.dispose(); }

  Future<void> _pickImages() async {
    try {
      final files = await ImagePicker().pickMultiImage();
      if (files.isEmpty || !mounted) return;
      if (_imageUrls.length + _pickedImageBytes.length + files.length > 20) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Um produto pode ter no máximo 20 imagens.')));
        return;
      }
      final picked = <Uint8List>[];
      for (final file in files) {
        final bytes = await file.readAsBytes();
        if (!mounted) return;
        if (bytes.length > 5 * 1024 * 1024) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cada imagem deve ter no máximo 5 MB.')));
          return;
        }
        picked.add(bytes);
      }
      setState(() => _pickedImageBytes.addAll(picked));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Não foi possível ler as imagens selecionadas.')));
    }
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    if (_pickedImageBytes.isEmpty && _imageUrls.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Escolhe pelo menos uma imagem para este produto.')));
      return;
    }
    setState(() => _saving = true);
    try {
      final uploaded = await widget.repository.uploadProductImages(_pickedImageBytes.map(base64Encode).toList());
      final imageUrls = [..._imageUrls, ...uploaded];
      final fields = <String, dynamic>{
      'name': _name.text.trim(), 'description': _description.text.trim().isEmpty ? null : _description.text.trim(),
      'price': double.parse(_price.text.replaceAll(',', '.')), 'stock_status': _stockStatus,
      'image_url': imageUrls.first, 'image_urls': imageUrls, 'category_id': _categoryId,
      'is_popular': _popular, 'is_new_arrival': _newArrival,
      };
      var notificationError = false;
      if (widget.product == null) {
        final productId = await widget.repository.createProduct(fields);
        if (_notifyCustomers) {
          try {
            final notificationMessage = _notificationMessage?.trim().isNotEmpty == true
                ? _notificationMessage!.trim()
                : 'Novo produto disponível: ${_name.text.trim()}';
            await widget.repository.createProductNotification(
              productId: productId,
              title: 'Novo produto disponível',
              message: notificationMessage,
            );
          } catch (_) {
            notificationError = true;
          }
        }
      } else {
        await widget.repository.updateProduct(widget.product!.id, fields);
      }
      if (notificationError && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Produto criado, mas a notificação não foi publicada. A API de notificações não confirmou o pedido.'),
            backgroundColor: Color(0xFFB54708),
          ),
        );
      }
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_errorText(error)), backgroundColor: const Color(0xFFB42318)));
      if (mounted) setState(() => _saving = false);
    }
  }

  String? _required(String? value, String label) => value == null || value.trim().isEmpty ? '$label é obrigatório.' : null;

  Widget _preview(Widget image, VoidCallback remove) => Stack(children: [ClipRRect(borderRadius: BorderRadius.circular(8), child: SizedBox(width: 70, height: 70, child: image)), Positioned(right: 0, top: 0, child: IconButton.filledTonal(tooltip: 'Remover imagem', visualDensity: VisualDensity.compact, onPressed: remove, icon: const Icon(Icons.close, size: 16)))]);

  @override
  Widget build(BuildContext context) => AlertDialog(
        title: Text(widget.product == null ? 'Adicionar produto' : 'Editar produto'),
        content: SizedBox(width: 550, child: SingleChildScrollView(child: Form(key: _form, child: Column(mainAxisSize: MainAxisSize.min, children: [
          TextFormField(controller: _name, onChanged: (_) => setState(() {}), decoration: const InputDecoration(labelText: 'Nome do produto'), validator: (v) => _required(v, 'O nome')),
          const SizedBox(height: 12),
          TextFormField(controller: _description, minLines: 2, maxLines: 4, decoration: const InputDecoration(labelText: 'Descrição')),
          const SizedBox(height: 12),
          TextFormField(controller: _price, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Preço (MZN)'), validator: (value) { if (_required(value, 'O preço') != null) return 'O preço é obrigatório.'; final amount = double.tryParse(value!.replaceAll(',', '.')); return amount == null || amount < 0 ? 'Introduz um preço válido.' : null; }),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(value: _stockStatus, decoration: const InputDecoration(labelText: 'Disponibilidade'), items: const [DropdownMenuItem(value: 'in_stock', child: Text('Em stock')), DropdownMenuItem(value: 'low_stock', child: Text('Últimas unidades')), DropdownMenuItem(value: 'out_of_stock', child: Text('Esgotado'))], onChanged: (value) { if (value != null) setState(() => _stockStatus = value); }),
          const SizedBox(height: 12),
          DropdownButtonFormField<int?>(value: _categoryId, decoration: const InputDecoration(labelText: 'Categoria'), items: [const DropdownMenuItem<int?>(value: null, child: Text('Sem categoria')), ...widget.categories.map((category) => DropdownMenuItem<int?>(value: category.id, child: Text('${category.parentId == null ? '' : '↳ '}${category.name}', overflow: TextOverflow.ellipsis)))], onChanged: (value) => setState(() => _categoryId = value)),
          const SizedBox(height: 12),
          Align(alignment: Alignment.centerLeft, child: OutlinedButton.icon(onPressed: _saving ? null : _pickImages, icon: const Icon(Icons.upload_file_outlined), label: const Text('Adicionar imagens'))),
          if (_pickedImageBytes.isNotEmpty || _imageUrls.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(spacing: 8, runSpacing: 8, children: [
              ..._imageUrls.asMap().entries.map((e) => _preview(Image.network(ApiConstants.resolveImageUrl(e.value), fit: BoxFit.cover, errorBuilder: (_, __, ___) => const ColoredBox(color: Color(0xFFF2F4F7), child: Icon(Icons.broken_image_outlined))), () => setState(() => _imageUrls.removeAt(e.key)))),
              ..._pickedImageBytes.asMap().entries.map((e) => _preview(Image.memory(e.value, fit: BoxFit.cover), () => setState(() => _pickedImageBytes.removeAt(e.key)))),
            ]),
            const SizedBox(height: 6),
            Text('${_imageUrls.length + _pickedImageBytes.length} imagem(ns). Máximo 5 MB por ficheiro.', style: const TextStyle(color: _muted, fontSize: 12)),
          ],
          CheckboxListTile(contentPadding: EdgeInsets.zero, value: _newArrival, onChanged: (value) => setState(() => _newArrival = value ?? false), title: const Text('Mostrar como novidade no customer app'), controlAffinity: ListTileControlAffinity.leading),
          CheckboxListTile(contentPadding: EdgeInsets.zero, value: _popular, onChanged: (value) => setState(() => _popular = value ?? false), title: const Text('Mostrar nos produtos populares'), controlAffinity: ListTileControlAffinity.leading),
          if (widget.product == null) ...[
            const Divider(height: 24),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: _notifyCustomers,
              onChanged: _saving ? null : (value) => setState(() => _notifyCustomers = value ?? false),
              title: const Text('Notificar clientes sobre este produto'),
              controlAffinity: ListTileControlAffinity.leading,
            ),
            if (_notifyCustomers) ...[
              TextFormField(
                initialValue: _notificationMessage,
                maxLength: 240,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Mensagem da notificação (opcional)',
                  hintText: 'Novo produto disponível: ...',
                ),
                onChanged: (value) => setState(() => _notificationMessage = value),
              ),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: const Color(0xFFF2F4F7), borderRadius: BorderRadius.circular(8)),
                child: Text(
                  _notificationMessage?.trim().isNotEmpty == true
                      ? _notificationMessage!.trim()
                      : 'Novo produto disponível: ${_name.text.trim().isEmpty ? 'Nome do produto' : _name.text.trim()}',
                  style: const TextStyle(color: _muted),
                ),
              ),
            ],
          ],
          Align(alignment: Alignment.centerLeft, child: Text('Imagens locais · máximo 5 MB por ficheiro', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: _muted))),
        ])))),
        actions: [TextButton(onPressed: _saving ? null : () => Navigator.pop(context, false), child: const Text('Cancelar')), FilledButton(onPressed: _saving ? null : _save, child: _saving ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Guardar'))],
      );
}

class _ColumnLabel extends StatelessWidget {
  const _ColumnLabel(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Text(text, style: const TextStyle(color: _muted, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: .6));
}

class _StockStatusChip extends StatelessWidget {
  const _StockStatusChip({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final (label, color, background) = switch (status) {
      'in_stock' => ('Em stock', const Color(0xFF12805C), const Color(0xFFE8F8F1)),
      'low_stock' => ('Últimas unidades', const Color(0xFFB54708), const Color(0xFFFFF3E8)),
      _ => ('Esgotado', const Color(0xFFB42318), const Color(0xFFFEF3F2)),
    };
    return Align(alignment: Alignment.centerLeft, child: Container(padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5), decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(20)), child: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 11))));
  }
}

class _CatalogError extends StatelessWidget {
  const _CatalogError({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Text(message, textAlign: TextAlign.center), const SizedBox(height: 12), OutlinedButton(onPressed: onRetry, child: const Text('Tentar novamente'))]));
}

class _EmptyCatalog extends StatelessWidget {
  const _EmptyCatalog({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Center(child: Text(message, style: const TextStyle(color: _muted)));
}

String _errorText(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['message'] != null) return data['message'].toString();
    if (error.response?.statusCode == 409) return 'Não foi possível concluir porque este registo está em uso.';
  }
  return error.toString().replaceFirst('Exception: ', '');
}
