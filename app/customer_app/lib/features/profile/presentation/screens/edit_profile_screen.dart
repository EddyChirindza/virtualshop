import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_text.dart';
import '../../../../core/errors/api_exception.dart';
import '../../domain/models/profile.dart';
import '../providers/profile_providers.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({required this.profile, super.key});

  final Profile profile;

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _firstNameController;
  late final TextEditingController _lastNameController;
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;
  late DateTime? _dateOfBirth;
  late String? _gender;
  bool _saving = false;

  static const _genders = ['male', 'female', 'other', 'prefer_not_to_say'];

  @override
  void initState() {
    super.initState();
    _firstNameController = TextEditingController(
      text: widget.profile.displayFirstName,
    );
    _lastNameController = TextEditingController(
      text: widget.profile.displayLastName,
    );
    _emailController = TextEditingController(text: widget.profile.email);
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
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
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
        'fullName':
            '${_firstNameController.text.trim()} ${_lastNameController.text.trim()}'
                .trim(),
        'phone': _phoneController.text.trim().replaceAll(
          RegExp(r'[^+0-9]'),
          '',
        ),
        'birthDate': _dateOfBirth?.toIso8601String().split('T').first,
        'gender': _gender,
        if (widget.profile.email.trim().isEmpty &&
            _emailController.text.trim().isNotEmpty)
          'email': _emailController.text.trim(),
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

  String? _validateEmail(String? value) {
    final email = value?.trim() ?? '';
    if (email.isEmpty) return null;
    return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)
        ? null
        : appText(
            context,
            'Introduz um e-mail válido.',
            'Enter a valid email address.',
          );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: Text(
          appText(context, 'Informações pessoais', 'Personal information'),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(
            20,
            20,
            20,
            MediaQuery.viewInsetsOf(context).bottom + 20,
          ),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
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
                      controller: _firstNameController,
                      textCapitalization: TextCapitalization.words,
                      decoration: _decoration(
                        context,
                        label: appText(context, 'Nome', 'First name'),
                        icon: Icons.person_outline,
                      ),
                      validator: (value) => (value?.trim().isNotEmpty ?? false)
                          ? null
                          : appText(
                              context,
                              'Indica o teu nome.',
                              'Enter your first name.',
                            ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _lastNameController,
                      textCapitalization: TextCapitalization.words,
                      decoration: _decoration(
                        context,
                        label: appText(context, 'Apelido', 'Last name'),
                        icon: Icons.person_outline,
                      ),
                      validator: (value) => (value?.trim().isNotEmpty ?? false)
                          ? null
                          : appText(
                              context,
                              'Indica o teu apelido.',
                              'Enter your last name.',
                            ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _emailController,
                      readOnly: widget.profile.email.trim().isNotEmpty,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      decoration: _decoration(
                        context,
                        label: appText(context, 'E-mail', 'Email'),
                        icon: Icons.mail_outline,
                        helper: widget.profile.email.trim().isNotEmpty
                            ? appText(
                                context,
                                'O e-mail não pode ser alterado.',
                                'Email cannot be changed.',
                              )
                            : appText(
                                context,
                                'Opcional. Só poderá ser adicionado uma vez.',
                                'Optional. It can only be added once.',
                              ),
                      ),
                      validator: _validateEmail,
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
