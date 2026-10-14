import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_text.dart';
import '../../../../core/errors/api_exception.dart';
import '../providers/profile_providers.dart';

class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  ConsumerState<ChangePasswordScreen> createState() =>
      _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _saving = false;
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  String? _validateNewPassword(String? value) {
    final password = value ?? '';
    if (password.length < 8) {
      return appText(
        context,
        'Mínimo de 8 caracteres.',
        'Use at least 8 characters.',
      );
    }
    if (!RegExp(r'[A-Z]').hasMatch(password)) {
      return appText(
        context,
        'Inclui uma letra maiúscula.',
        'Include an uppercase letter.',
      );
    }
    if (!RegExp(r'[a-z]').hasMatch(password)) {
      return appText(
        context,
        'Inclui uma letra minúscula.',
        'Include a lowercase letter.',
      );
    }
    if (!RegExp(r'[0-9]').hasMatch(password)) {
      return appText(context, 'Inclui um número.', 'Include a number.');
    }
    return null;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await ref
          .read(profileRepositoryProvider)
          .changePassword(
            currentPassword: _currentPasswordController.text,
            newPassword: _newPasswordController.text,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(
              appText(
                context,
                'Palavra-passe alterada com sucesso.',
                'Password changed successfully.',
              ),
            ),
          ),
        );
      Navigator.of(context).pop();
    } on ApiException catch (error) {
      if (mounted) _showError(error.message);
    } catch (_) {
      if (mounted) {
        _showError(
          appText(
            context,
            'Não foi possível alterar a palavra-passe. Tenta novamente.',
            'Could not change the password. Try again.',
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

  InputDecoration _decoration({
    required String label,
    required IconData icon,
    required bool obscure,
    required VoidCallback onToggleVisibility,
  }) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon),
      border: const OutlineInputBorder(),
      suffixIcon: IconButton(
        tooltip: appText(
          context,
          obscure ? 'Mostrar palavra-passe' : 'Ocultar palavra-passe',
          obscure ? 'Show password' : 'Hide password',
        ),
        onPressed: onToggleVisibility,
        icon: Icon(
          obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: Text(
          appText(context, 'Alterar palavra-passe', 'Change password'),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
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
                        'Confirma a tua palavra-passe atual e define uma nova.',
                        'Confirm your current password and choose a new one.',
                      ),
                      style: Theme.of(context).textTheme.bodyMedium
                          ?.copyWith(color: colors.onSurfaceVariant),
                    ),
                    const SizedBox(height: 24),
                    TextFormField(
                      controller: _currentPasswordController,
                      obscureText: _obscureCurrent,
                      autofillHints: const [AutofillHints.password],
                      textInputAction: TextInputAction.next,
                      decoration: _decoration(
                        label: appText(
                          context,
                          'Palavra-passe antiga',
                          'Current password',
                        ),
                        icon: Icons.lock_outline,
                        obscure: _obscureCurrent,
                        onToggleVisibility: () =>
                            setState(() => _obscureCurrent = !_obscureCurrent),
                      ),
                      validator: (value) => (value ?? '').isEmpty
                          ? appText(
                              context,
                              'Introduz a palavra-passe antiga.',
                              'Enter your current password.',
                            )
                          : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _newPasswordController,
                      obscureText: _obscureNew,
                      autofillHints: const [AutofillHints.newPassword],
                      textInputAction: TextInputAction.next,
                      decoration: _decoration(
                        label: appText(
                          context,
                          'Nova palavra-passe',
                          'New password',
                        ),
                        icon: Icons.lock_reset_outlined,
                        obscure: _obscureNew,
                        onToggleVisibility: () =>
                            setState(() => _obscureNew = !_obscureNew),
                      ),
                      validator: _validateNewPassword,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _confirmPasswordController,
                      obscureText: _obscureConfirm,
                      autofillHints: const [AutofillHints.newPassword],
                      textInputAction: TextInputAction.done,
                      decoration: _decoration(
                        label: appText(
                          context,
                          'Confirmar nova palavra-passe',
                          'Confirm new password',
                        ),
                        icon: Icons.lock_outline,
                        obscure: _obscureConfirm,
                        onToggleVisibility: () =>
                            setState(() => _obscureConfirm = !_obscureConfirm),
                      ),
                      validator: (value) => value != _newPasswordController.text
                          ? appText(
                              context,
                              'As palavras-passe não coincidem.',
                              'Passwords do not match.',
                            )
                          : null,
                      onFieldSubmitted: (_) => _submit(),
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: _saving ? null : _submit,
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.all(16),
                      ),
                      child: _saving
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(
                              appText(
                                context,
                                'Guardar nova palavra-passe',
                                'Save new password',
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
}
