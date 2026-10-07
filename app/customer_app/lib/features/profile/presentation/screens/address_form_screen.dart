import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_text.dart';
import '../../../../core/errors/api_exception.dart';
import '../../domain/models/profile_address.dart';
import '../providers/profile_providers.dart';

class AddressFormScreen extends ConsumerStatefulWidget {
  const AddressFormScreen({this.address, super.key});

  final ProfileAddress? address;

  @override
  ConsumerState<AddressFormScreen> createState() => _AddressFormScreenState();
}

class _AddressFormScreenState extends ConsumerState<AddressFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _label = TextEditingController();
  final _province = TextEditingController();
  final _city = TextEditingController();
  final _neighborhood = TextEditingController();
  final _street = TextEditingController();
  final _number = TextEditingController();
  final _reference = TextEditingController();
  bool _isDefault = false;
  bool _saving = false;
  bool _deleting = false;

  bool get _editing => widget.address != null;

  @override
  void initState() {
    super.initState();
    final address = widget.address;
    if (address == null) return;
    _label.text = address.label;
    _province.text = address.province;
    _city.text = address.city;
    _neighborhood.text = address.neighborhood;
    _street.text = address.street;
    _number.text = address.number;
    _reference.text = address.reference ?? '';
    _isDefault = address.isDefault;
  }

  @override
  void dispose() {
    _label.dispose();
    _province.dispose();
    _city.dispose();
    _neighborhood.dispose();
    _street.dispose();
    _number.dispose();
    _reference.dispose();
    super.dispose();
  }

  String? _required(String? value) => (value?.trim().isEmpty ?? true)
      ? appText(context, 'Este campo é obrigatório.', 'This field is required.')
      : null;

  Map<String, dynamic> _fields() => {
    'label': _label.text.trim(),
    'province': _province.text.trim(),
    'city': _city.text.trim(),
    'neighborhood': _neighborhood.text.trim(),
    'street': _street.text.trim(),
    'number': _number.text.trim(),
    'reference': _reference.text.trim().isEmpty ? null : _reference.text.trim(),
    'is_default': _isDefault,
  };

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final controller = ref.read(profileAddressesProvider.notifier);
      if (_editing) {
        await controller.updateAddress(widget.address!.id, _fields());
      } else {
        await controller.add(_fields());
      }
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      _showError(error.message);
    } catch (_) {
      _showError(
        appText(
          context,
          'Não foi possível guardar o endereço. Tenta novamente.',
          'Could not save address. Try again.',
        ),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(appText(context, 'Remover endereço?', 'Remove address?')),
        content: Text(
          appText(
            context,
            'Esta ação não pode ser anulada.',
            'This action cannot be undone.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(appText(context, 'Cancelar', 'Cancel')),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(context, true),
            child: Text(appText(context, 'Remover', 'Remove')),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => _deleting = true);
    try {
      await ref
          .read(profileAddressesProvider.notifier)
          .remove(widget.address!.id);
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      _showError(error.message);
    } catch (_) {
      _showError(
        appText(
          context,
          'Não foi possível remover o endereço. Tenta novamente.',
          'Could not remove address. Try again.',
        ),
      );
    } finally {
      if (mounted) setState(() => _deleting = false);
    }
  }

  void _showError(String message) => ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        _editing
            ? appText(context, 'Editar endereço', 'Edit address')
            : appText(context, 'Novo endereço', 'New address'),
      ),
    ),
    body: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 680),
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              TextFormField(
                controller: _label,
                decoration: InputDecoration(
                  labelText: appText(context, 'Nome do local', 'Address label'),
                  hintText: appText(
                    context,
                    'Casa, Trabalho...',
                    'Home, Work...',
                  ),
                ),
                validator: _required,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _province,
                decoration: InputDecoration(
                  labelText: appText(context, 'Província', 'Province'),
                ),
                validator: _required,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _city,
                decoration: InputDecoration(
                  labelText: appText(context, 'Cidade', 'City'),
                ),
                validator: _required,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _neighborhood,
                decoration: InputDecoration(
                  labelText: appText(context, 'Bairro', 'Neighborhood'),
                ),
                validator: _required,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _street,
                decoration: InputDecoration(
                  labelText: appText(context, 'Avenida / Rua', 'Street'),
                ),
                validator: _required,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _number,
                decoration: InputDecoration(
                  labelText: appText(context, 'Número', 'Number'),
                ),
                validator: _required,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _reference,
                decoration: InputDecoration(
                  labelText: appText(
                    context,
                    'Referência (opcional)',
                    'Reference (optional)',
                  ),
                ),
                textCapitalization: TextCapitalization.sentences,
              ),
              const SizedBox(height: 8),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: _isDefault,
                onChanged: (value) =>
                    setState(() => _isDefault = value ?? false),
                title: Text(
                  appText(context, 'Definir como padrão', 'Set as default'),
                ),
                controlAffinity: ListTileControlAffinity.leading,
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _saving || _deleting ? null : _save,
                child: _saving
                    ? const SizedBox.square(
                        dimension: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(
                        appText(context, 'Guardar endereço', 'Save address'),
                      ),
              ),
              if (_editing) ...[
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: _saving || _deleting ? null : _delete,
                  icon: const Icon(Icons.delete_outline),
                  label: _deleting
                      ? Text(appText(context, 'A remover...', 'Removing...'))
                      : Text(
                          appText(
                            context,
                            'Remover endereço',
                            'Remove address',
                          ),
                        ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Theme.of(context).colorScheme.error,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    ),
  );
}
