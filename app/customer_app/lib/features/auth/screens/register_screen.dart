import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/app_text.dart';
import '../../../core/errors/api_exception.dart';
import '../providers/auth_providers.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();

    setState(() => _isLoading = true);
    try {
      await ref
          .read(authControllerProvider.notifier)
          .register(
            name: _nameController.text.trim(),
            email: _emailController.text.trim(),
            password: _passwordController.text,
            phone: _phoneController.text.replaceAll(' ', ''),
          );
      // Conta criada e sessão iniciada. Este ecrã foi empurrado por cima do
      // AuthGate, por isso tem de se fechar para deixar ver a Home.
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      _showError(e.message);
    } catch (_) {
      if (mounted) {
        _showError(
          appText(context, 'Erro ao criar conta.', 'Could not create account.'),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = _isLoading;

    return Scaffold(
      appBar: AppBar(
        title: Text(appText(context, 'Criar conta', 'Create account')),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _nameController,
                  decoration: InputDecoration(
                    labelText: appText(context, 'Nome completo', 'Full name'),
                    prefixIcon: Icon(Icons.person_outline),
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty)
                      ? appText(context, 'Indica o teu nome', 'Enter your name')
                      : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    labelText: appText(context, 'E-mail', 'Email'),
                    prefixIcon: Icon(Icons.email_outlined),
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty)
                      return appText(
                        context,
                        'Indica o teu e-mail',
                        'Enter your email',
                      );
                    if (!v.contains('@'))
                      return appText(
                        context,
                        'E-mail inválido',
                        'Invalid email',
                      );
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(
                    labelText: appText(context, 'Telemóvel', 'Phone number'),
                    hintText: '84 123 4567',
                    prefixIcon: const Icon(Icons.phone_outlined),
                    border: const OutlineInputBorder(),
                  ),
                  validator: (v) {
                    final phone = (v ?? '').replaceAll(' ', '');
                    if (!RegExp(r'^\+?[0-9]{9,15}$').hasMatch(phone)) {
                      return appText(
                        context,
                        'Telemóvel inválido (9 a 15 dígitos)',
                        'Invalid phone number (9 to 15 digits)',
                      );
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: appText(context, 'Palavra-passe', 'Password'),
                    prefixIcon: const Icon(Icons.lock_outline),
                    border: const OutlineInputBorder(),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                      ),
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                  validator: (v) {
                    final value = v ?? '';
                    if (value.length < 8)
                      return appText(
                        context,
                        'Mínimo de 8 caracteres',
                        'At least 8 characters',
                      );
                    if (!RegExp(r'[A-Z]').hasMatch(value))
                      return appText(
                        context,
                        'Falta uma letra maiúscula',
                        'Add an uppercase letter',
                      );
                    if (!RegExp(r'[a-z]').hasMatch(value))
                      return appText(
                        context,
                        'Falta uma letra minúscula',
                        'Add a lowercase letter',
                      );
                    if (!RegExp(r'[0-9]').hasMatch(value))
                      return appText(
                        context,
                        'Falta um número',
                        'Add a number',
                      );
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _confirmController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: appText(
                      context,
                      'Confirmar palavra-passe',
                      'Confirm password',
                    ),
                    prefixIcon: Icon(Icons.lock_outline),
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) {
                    if (v != _passwordController.text) {
                      return appText(
                        context,
                        'As palavras-passe não coincidem',
                        'Passwords do not match',
                      );
                    }
                    return null;
                  },
                  onFieldSubmitted: (_) => _submit(),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: isLoading ? null : _submit,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.all(16),
                  ),
                  child: isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(appText(context, 'Criar conta', 'Create account')),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
