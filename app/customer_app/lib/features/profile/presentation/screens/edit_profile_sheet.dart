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

  static const _genders = ['male', 'female', 'other', 'prefer_not_to_say'];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.profile.fullName);
    _phoneController = TextEditingController(text: widget.profile.phone ?? '');
    _dateOfBirth = widget.profile.dateOfBirth;
    _gender = switch (widget.profile.gender?.toLowerCase()) {
      'male' || 'masculino' => 'male',
      'female' || 'feminino' => 'female',
      'other' || 'outro' => 'other',
      'prefer_not_to_say' || 'prefiro não dizer' => 'prefer_not_to_say',
      _ => null,
    };
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
        'fullName': _nameController.text.trim(),
        'phone': _phoneController.text.trim().replaceAll(
          RegExp(r'[^+0-9]'),
          '',
        ),
        'birthDate': _dateOfBirth?.toIso8601String().split('T').first,
        'gender': _gender,
      });
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (error) {
      if (mounted) _showError(error.message);
    } catch (_) {
      if (mounted) {
        _showError(
          appText(
            context,
            'Não foi possível guardar as informações. Tenta novamente.',
            'Could not save information. Try again.',
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showError(String message) => ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));

  String _genderLabel(BuildContext context, String gender) => switch (gender) {
    'male' => appText(context, 'Masculino', 'Male'),
    'female' => appText(context, 'Feminino', 'Female'),
    'other' => appText(context, 'Outro', 'Other'),
    _ => appText(context, 'Prefiro não dizer', 'Prefer not to say'),
  };

  String? _validatePhone(String? value) {
    final phone = (value ?? '').replaceAll(RegExp(r'[^+0-9]'), '');
    final valid = RegExp(r'^(?:[0-9]{9,15}|\+[1-9][0-9]{7,14})$')
        .hasMatch(phone);
    return valid
        ? null
        : appText(
            context,
            'Introduz um telefone válido com indicativo internacional.',
            'Enter a valid phone number with its country code.',
          );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final initials = _nameController.text
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .take(2)
        .map((part) => part[0].toUpperCase())
        .join();

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          12,
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
                Center(
                  child: CircleAvatar(
                    radius: 30,
                    backgroundColor: colors.primaryContainer,
                    child: Text(
                      initials.isEmpty ? '?' : initials,
                      style: theme.textTheme.titleLarge?.copyWith(
                        color: colors.onPrimaryContainer,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  appText(
                    context,
                    'Informações pessoais',
                    'Personal information',
                  ),
                  textAlign: TextAlign.center,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  appText(
                    context,
                    'Mantém os teus dados de conta atualizados.',
                    'Keep your account details up to date.',
                  ),
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 24),
                _sectionLabel(context, 'Dados da conta', 'Account details'),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _nameController,
                  textCapitalization: TextCapitalization.words,
                  decoration: _decoration(
                    context,
                    label: appText(context, 'Nome completo', 'Full name'),
                    icon: Icons.person_outline,
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
                  decoration: _decoration(
                    context,
                    label: appText(context, 'E-mail', 'Email'),
                    icon: Icons.mail_outline,
                    helper: appText(
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
                  decoration: _decoration(
                    context,
                    label: appText(context, 'Telefone', 'Phone'),
                    icon: Icons.phone_outlined,
                    hint: '+258 84 123 4567',
                  ),
                  validator: _validatePhone,
                ),
                const SizedBox(height: 22),
                _sectionLabel(context, 'Detalhes pessoais', 'Personal details'),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: _chooseDate,
                  icon: const Icon(Icons.calendar_month_outlined),
                  label: Text(
                    _dateOfBirth == null
                        ? appText(
                            context,
                            'Data de nascimento',
                            'Date of birth',
                          )
                        : '${_dateOfBirth!.day.toString().padLeft(2, '0')}/${_dateOfBirth!.month.toString().padLeft(2, '0')}/${_dateOfBirth!.year}',
                  ),
                  style: OutlinedButton.styleFrom(
                    alignment: Alignment.centerLeft,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 16,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _gender,
                  decoration: _decoration(
                    context,
                    label: appText(context, 'Género', 'Gender'),
                    icon: Icons.person_search_outlined,
                  ),
                  items: [
                    for (final gender in _genders)
                      DropdownMenuItem(
                        value: gender,
                        child: Text(_genderLabel(context, gender)),
                      ),
                  ],
                  onChanged: (value) => setState(() => _gender = value),
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: _saving ? null : _save,
                  icon: _saving
                      ? const SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.check),
                  label: Text(
                    _saving
                        ? appText(context, 'A guardar...', 'Saving...')
                        : appText(
                            context,
                            'Guardar alterações',
                            'Save changes',
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _sectionLabel(
    BuildContext context,
    String portuguese,
    String english,
  ) => Text(
    appText(context, portuguese, english),
    style: Theme.of(context).textTheme.titleSmall?.copyWith(
      fontWeight: FontWeight.w700,
      color: Theme.of(context).colorScheme.primary,
    ),
  );

  InputDecoration _decoration(
    BuildContext context, {
    required String label,
    required IconData icon,
    String? hint,
    String? helper,
  }) => InputDecoration(
    labelText: label,
    hintText: hint,
    helperText: helper,
    prefixIcon: Icon(icon),
    filled: true,
    fillColor: Theme.of(context).colorScheme.surfaceContainerLowest,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
  );
}
