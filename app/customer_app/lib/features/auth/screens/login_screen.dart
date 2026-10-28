import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/app_text.dart';
import '../../../core/errors/api_exception.dart';
import '../providers/auth_providers.dart';
import '../widgets/phone_number_field.dart';
import 'register_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  String _phoneCountryCode = '+258';
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();

    setState(() => _isLoading = true);
    try {
      await ref
          .read(authControllerProvider.notifier)
          .login(
            identifier: formatInternationalPhone(
              _phoneCountryCode,
              _phoneController.text,
            ),
            password: _passwordController.text,
          );
      if (kIsWeb && mounted && Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
      }
      // Sucesso: o AuthGate (em main.dart) vê o utilizador e troca este
      // ecrã pela Home — não é preciso navegar manualmente.
    } on ApiException catch (e) {
      _showError(e.message);
    } catch (_) {
      if (mounted) {
        _showError(
          appText(context, 'Erro ao iniciar sessão.', 'Could not sign in.'),
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
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 48),
                  Text(
                    'VirtualShop',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    appText(
                      context,
                      'Inicia sessão para continuar',
                      'Sign in to continue',
                    ),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 32),
                  PhoneNumberField(
                    controller: _phoneController,
                    countryCode: _phoneCountryCode,
                    onCountryCodeChanged: (value) =>
                        setState(() => _phoneCountryCode = value),
                    validator: (value) {
                      if (!isValidInternationalPhone(
                        _phoneCountryCode,
                        value ?? '',
                      )) {
                        return appText(
                          context,
                          'Número de telefone inválido.',
                          'Invalid phone number.',
                        );
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    autofillHints: const [AutofillHints.password],
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
                        onPressed: () => setState(
                          () => _obscurePassword = !_obscurePassword,
                        ),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return appText(
                          context,
                          'Indica a tua palavra-passe',
                          'Enter your password',
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
                        : Text(appText(context, 'Entrar', 'Sign in')),
                  ),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: isLoading
                        ? null
                        : () => Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const RegisterScreen(),
                            ),
                          ),
                    child: Text(
                      appText(
                        context,
                        'Não tens conta? Regista-te',
                        'Don’t have an account? Sign up',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
