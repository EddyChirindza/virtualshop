import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_text.dart';
import '../../../../core/errors/api_exception.dart';
import '../../domain/models/payment_method.dart';
import '../providers/payment_methods_provider.dart';

class PaymentMethodFormScreen extends ConsumerStatefulWidget {
  const PaymentMethodFormScreen({this.method, super.key});

  final PaymentMethod? method;

  @override
  ConsumerState<PaymentMethodFormScreen> createState() =>
      _PaymentMethodFormScreenState();
}

class _PaymentMethodFormScreenState
    extends ConsumerState<PaymentMethodFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _label = TextEditingController();
  final _phone = TextEditingController();
  final _cardNumber = TextEditingController();
  final _cardHolder = TextEditingController();
  late PaymentMethodType _type;
  late int _expiryMonth;
  late int _expiryYear;
  late bool _isDefault;
  bool _saving = false;
  bool _deleting = false;

  bool get _editing => widget.method != null;

  @override
  void initState() {
    super.initState();
    final method = widget.method;
    final now = DateTime.now();
    _type = method?.type ?? PaymentMethodType.mpesa;
    _label.text = method?.label ?? '';
    _phone.text = method?.phone ?? '';
    _cardHolder.text = method?.accountName ?? '';
    _expiryMonth = method?.expiryMonth ?? now.month;
    _expiryYear = method?.expiryYear ?? now.year + 1;
    _isDefault = method?.isDefault ?? false;
  }

  @override
  void dispose() {
    _label.dispose();
    _phone.dispose();
    _cardNumber.dispose();
    _cardHolder.dispose();
    super.dispose();
  }

  String? _validatePhone(String? value) {
    final phone = _normalizePhone(value ?? '');
    final valid = RegExp(r'^(?:[0-9]{9,15}|\+[1-9][0-9]{7,14})$')
        .hasMatch(phone);
    return valid
        ? null
        : appText(
            context,
            'Introduz um número de telefone válido.',
            'Enter a valid phone number.',
          );
  }

  String? _validateCardNumber(String? value) {
    final digits = (value ?? '').replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty && _editing) return null;
    final valid = RegExp(r'^4[0-9]{12,18}$').hasMatch(digits);
    return valid
        ? null
        : appText(
            context,
            'Introduz um número de cartão Visa válido.',
            'Enter a valid Visa card number.',
          );
  }

  String? _validateCardHolder(String? value) {
    return (value?.trim().length ?? 0) >= 2
        ? null
        : appText(
            context,
            'Indica o nome no cartão.',
            'Enter the name on the card.',
          );
  }

  bool get _expiryIsPast {
    final now = DateTime.now();
    return _expiryYear < now.year ||
        (_expiryYear == now.year && _expiryMonth < now.month);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_type == PaymentMethodType.visa && _expiryIsPast) {
      _showError(
        appText(
          context,
          'A validade do cartão já expirou.',
          'The card has already expired.',
        ),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      final controller = ref.read(paymentMethodsProvider.notifier);
      final fields = _fields();
      if (_editing) {
        await controller.updateMethod(widget.method!.id, fields);
      } else {
        await controller.add(fields);
      }
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      if (mounted) _showError(error.message);
    } catch (_) {
      if (mounted) {
        _showError(
          appText(
            context,
            'Não foi possível guardar o método de pagamento. Tenta novamente.',
            'Could not save the payment method. Try again.',
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          appText(context, 'Remover método?', 'Remove payment method?'),
        ),
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
      await ref.read(paymentMethodsProvider.notifier).remove(widget.method!.id);
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      if (mounted) _showError(error.message);
    } catch (_) {
      if (mounted) {
        _showError(
          appText(
            context,
            'Não foi possível remover o método. Tenta novamente.',
            'Could not remove the payment method. Try again.',
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _deleting = false);
    }
  }

  Map<String, dynamic> _fields() {
    final label = _label.text.trim();
    final fields = <String, dynamic>{
      'label': label.isEmpty ? null : label,
      'isDefault': _isDefault,
      if (!_editing) 'type': _type.apiValue,
    };

    if (_type == PaymentMethodType.mpesa) {
      fields['phone'] = _normalizePhone(_phone.text);
    } else {
      final cardNumber = _cardNumber.text.replaceAll(RegExp(r'\D'), '');
      if (cardNumber.isNotEmpty) fields['cardNumber'] = cardNumber;
      fields['cardHolder'] = _cardHolder.text.trim();
      fields['expiryMonth'] = _expiryMonth;
      fields['expiryYear'] = _expiryYear;
    }
    return fields;
  }

  String _normalizePhone(String value) =>
      value.replaceAll(RegExp(r'[\s().-]'), '');

  void _showError(String message) => ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final years = <int>{
      for (var year = now.year; year <= now.year + 20; year++) year,
      _expiryYear,
    }.toList()..sort();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _editing
              ? appText(
                  context,
                  'Editar método de pagamento',
                  'Edit payment method',
                )
              : appText(
                  context,
                  'Novo método de pagamento',
                  'New payment method',
                ),
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
                Text(
                  appText(
                    context,
                    'Escolhe o tipo de método que queres guardar.',
                    'Choose the type of payment method to save.',
                  ),
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 12),
                SegmentedButton<PaymentMethodType>(
                  segments: const [
                    ButtonSegment(
                      value: PaymentMethodType.mpesa,
                      icon: Icon(Icons.phone_android_outlined),
                      label: Text('M-Pesa'),
                    ),
                    ButtonSegment(
                      value: PaymentMethodType.visa,
                      icon: Icon(Icons.credit_card_outlined),
                      label: Text('Visa'),
                    ),
                  ],
                  selected: {_type},
                  onSelectionChanged: _editing
                      ? null
                      : (selection) => setState(() => _type = selection.first),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _label,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: InputDecoration(
                    labelText: appText(
                      context,
                      'Nome do método (opcional)',
                      'Method name (optional)',
                    ),
                    hintText: appText(
                      context,
                      'Ex.: Pessoal, Trabalho',
                      'E.g. Personal, Work',
                    ),
                  ),
                  maxLength: 50,
                ),
                const SizedBox(height: 8),
                if (_type == PaymentMethodType.mpesa)
                  ..._mpesaFields()
                else
                  ..._visaFields(context, years),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _isDefault,
                  onChanged: _editing && widget.method!.isDefault
                      ? null
                      : (value) => setState(() => _isDefault = value ?? false),
                  title: Text(
                    appText(context, 'Definir como padrão', 'Set as default'),
                  ),
                  controlAffinity: ListTileControlAffinity.leading,
                ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: _saving || _deleting ? null : _save,
                  child: _saving
                      ? const SizedBox.square(
                          dimension: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(
                          appText(
                            context,
                            'Guardar método',
                            'Save payment method',
                          ),
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
                              'Remover método',
                              'Remove payment method',
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

  List<Widget> _mpesaFields() => [
    TextFormField(
      controller: _phone,
      keyboardType: TextInputType.phone,
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'[0-9+ ]')),
        LengthLimitingTextInputFormatter(25),
      ],
      decoration: InputDecoration(
        labelText: appText(context, 'Número M-Pesa', 'M-Pesa number'),
        hintText: '+258 84 123 4567',
        prefixIcon: const Icon(Icons.phone_outlined),
      ),
      validator: _validatePhone,
    ),
    const SizedBox(height: 12),
  ];

  List<Widget> _visaFields(BuildContext context, List<int> years) => [
    TextFormField(
      controller: _cardNumber,
      keyboardType: TextInputType.number,
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(19),
      ],
      decoration: InputDecoration(
        labelText: appText(context, 'Número do cartão', 'Card number'),
        hintText: '4111 1111 1111 1111',
        prefixIcon: const Icon(Icons.credit_card_outlined),
        helperText: _editing
            ? appText(
                context,
                'Deixa em branco para manter •••• ${widget.method!.cardLast4 ?? ''}.',
                'Leave blank to keep •••• ${widget.method!.cardLast4 ?? ''}.',
              )
            : appText(
                context,
                'Apenas os últimos 4 dígitos são guardados.',
                'Only the last 4 digits are stored.',
              ),
      ),
      validator: _validateCardNumber,
    ),
    const SizedBox(height: 12),
    TextFormField(
      controller: _cardHolder,
      textCapitalization: TextCapitalization.words,
      decoration: InputDecoration(
        labelText: appText(context, 'Nome no cartão', 'Name on card'),
        prefixIcon: const Icon(Icons.person_outline),
      ),
      validator: _validateCardHolder,
    ),
    const SizedBox(height: 12),
    Row(
      children: [
        Expanded(
          child: DropdownButtonFormField<int>(
            initialValue: _expiryMonth,
            decoration: InputDecoration(
              labelText: appText(context, 'Mês', 'Month'),
            ),
            items: [
              for (var month = 1; month <= 12; month++)
                DropdownMenuItem(
                  value: month,
                  child: Text(month.toString().padLeft(2, '0')),
                ),
            ],
            onChanged: (value) {
              if (value != null) setState(() => _expiryMonth = value);
            },
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: DropdownButtonFormField<int>(
            initialValue: _expiryYear,
            decoration: InputDecoration(
              labelText: appText(context, 'Ano', 'Year'),
            ),
            items: [
              for (final year in years)
                DropdownMenuItem(value: year, child: Text('$year')),
            ],
            onChanged: (value) {
              if (value != null) setState(() => _expiryYear = value);
            },
          ),
        ),
      ],
    ),
    const SizedBox(height: 12),
  ];
}
