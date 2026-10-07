import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_text.dart';
import '../../../../core/errors/api_exception.dart';
import '../../domain/models/profile.dart';
import '../providers/profile_providers.dart';

class EditProfileSheet extends ConsumerStatefulWidget {
  const EditProfileSheet({required this.profile, super.key});

  final Profile profile;

  @override
  ConsumerState<EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends ConsumerState<EditProfileSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  late DateTime? _dateOfBirth;
  late String? _gender;
  bool _saving = false;

  static const _genders = [
    'Masculino',
    'Feminino',
    'Outro',
    'Prefiro não dizer',
  ];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.profile.fullName);
    _phoneController = TextEditingController(text: widget.profile.phone ?? '');
    _dateOfBirth = widget.profile.dateOfBirth;
    _gender = _genders.contains(widget.profile.gender)
        ? widget.profile.gender
        : null;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _chooseDate() async {
    final selected = await showDatePicker(
      context: context,
      initialDate: _dateOfBirth ?? DateTime(2000),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );
    if (selected != null) setState(() => _dateOfBirth = selected);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await ref.read(profileProvider.notifier).updateProfile({
        'full_name': _nameController.text.trim(),
        'phone': _phoneController.text.trim().replaceAll(RegExp(r'\s+'), ''),
        'date_of_birth': _dateOfBirth?.toIso8601String().split('T').first,
        'gender': _gender,
      });
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (error) {
      _showError(error.message);
    } catch (_) {
      _showError(
        appText(
          context,
          'Não foi possível guardar as informações. Tenta novamente.',
          'Could not save information. Try again.',
        ),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showError(String message) => ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));

  @override
  Widget build(BuildContext context) => SafeArea(
    child: Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                appText(
                  context,
                  'Informações pessoais',
                  'Personal information',
                ),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 18),
              TextFormField(
                controller: _nameController,
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(
                  labelText: appText(context, 'Nome completo', 'Full name'),
                ),
                validator: (value) => (value?.trim().length ?? 0) < 2
                    ? appText(
                        context,
                        'O nome deve ter pelo menos 2 caracteres.',
                        'Name must be at least 2 characters.',
                      )
                    : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                initialValue: widget.profile.email,
                readOnly: true,
                decoration: InputDecoration(
                  labelText: appText(context, 'E-mail', 'Email'),
                  helperText: appText(
                    context,
                    'O e-mail não pode ser alterado aqui.',
                    'Email cannot be changed here.',
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: appText(context, 'Telefone', 'Phone'),
                  hintText: '+258 84 123 4567',
                ),
                validator: (value) =>
                    RegExp(r'^\+258\d{9}$')
                        .hasMatch((value ?? '').replaceAll(RegExp(r'\s+'), ''))
                    ? null
                    : appText(
                        context,
                        'Usa +258 seguido de 9 dígitos.',
                        'Use +258 followed by 9 digits.',
                      ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _chooseDate,
                icon: const Icon(Icons.calendar_month_outlined),
                label: Text(
                  _dateOfBirth == null
                      ? appText(context, 'Data de nascimento', 'Date of birth')
                      : '${_dateOfBirth!.day.toString().padLeft(2, '0')}/${_dateOfBirth!.month.toString().padLeft(2, '0')}/${_dateOfBirth!.year}',
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _gender,
                decoration: InputDecoration(
                  labelText: appText(context, 'Género', 'Gender'),
                ),
                items: [
                  for (final gender in _genders)
                    DropdownMenuItem(
                      value: gender,
                      child: Text(switch (gender) {
                        'Masculino' => appText(context, 'Masculino', 'Male'),
                        'Feminino' => appText(context, 'Feminino', 'Female'),
                        'Outro' => appText(context, 'Outro', 'Other'),
                        _ => appText(
                          context,
                          'Prefiro não dizer',
                          'Prefer not to say',
                        ),
                      }),
                    ),
                ],
                onChanged: (value) => setState(() => _gender = value),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox.square(
                        dimension: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(
                        appText(context, 'Guardar alterações', 'Save changes'),
                      ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
