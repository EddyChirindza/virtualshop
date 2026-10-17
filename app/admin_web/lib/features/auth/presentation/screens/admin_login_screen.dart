import 'package:flutter/material.dart';

import '../../data/admin_auth_repository.dart';

class AdminLoginScreen extends StatefulWidget {
  const AdminLoginScreen({super.key, required this.onAuthenticated});

  final ValueChanged<String> onAuthenticated;

  @override
  State<AdminLoginScreen> createState() => _AdminLoginScreenState();
}

class _AdminLoginScreenState extends State<AdminLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _repository = AdminAuthRepository();
  bool _loading = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final token = await _repository.login(_phone.text.trim(), _password.text);
      if (mounted) widget.onAuthenticated(token);
    } catch (error) {
      if (mounted) setState(() => _error = _errorMessage(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _errorMessage(Object error) {
    final message = error.toString();
    if (message.contains('não tem acesso')) return message.replaceFirst('Exception: ', '');
    if (message.contains('401')) return 'Telefone ou palavra-passe incorretos.';
    if (message.contains('SocketException') || message.contains('connection')) {
      return 'Não foi possível ligar à API. Verifica a ligação e a URL configurada.';
    }
    return message.replaceFirst('Exception: ', '');
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 760;
    return Scaffold(
      body: Row(children: [
        if (wide)
          Expanded(
            child: Container(
              color: const Color(0xFF172554),
              padding: const EdgeInsets.all(56),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.storefront_rounded, color: Colors.white, size: 42),
                  SizedBox(height: 36),
                  Text('VirtualShop', style: TextStyle(color: Colors.white, fontSize: 38, fontWeight: FontWeight.w700)),
                  SizedBox(height: 12),
                  Text('Gestão da loja, pedidos e inventário num só lugar.', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 17, height: 1.5)),
                ],
              ),
            ),
          ),
        Expanded(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Form(
                  key: _formKey,
                  child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    if (!wide) const Icon(Icons.storefront_rounded, size: 40, color: Color(0xFF3157D5)),
                    const Text('Bem-vindo de volta', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    const Text('Entra com uma conta de administrador.', style: TextStyle(color: Color(0xFF64748B))),
                    const SizedBox(height: 28),
                    TextFormField(
                      controller: _phone,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(labelText: 'Telefone ou email', prefixIcon: Icon(Icons.person_outline), border: OutlineInputBorder()),
                      validator: (value) => value == null || value.trim().isEmpty ? 'Introduz o teu telefone ou email.' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _password,
                      obscureText: _obscure,
                      onFieldSubmitted: (_) => _submit(),
                      decoration: InputDecoration(labelText: 'Palavra-passe', prefixIcon: const Icon(Icons.lock_outline), border: const OutlineInputBorder(), suffixIcon: IconButton(onPressed: () => setState(() => _obscure = !_obscure), icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined))),
                      validator: (value) => value == null || value.isEmpty ? 'Introduz a tua palavra-passe.' : null,
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 16),
                      Text(_error!, style: const TextStyle(color: Color(0xFFB42318))),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(onPressed: _loading ? null : _submit, style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 17)), child: _loading ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Entrar no painel')),
                  ]),
                ),
              ),
            ),
          ),
        ),
      ]),
    );
  }
}
