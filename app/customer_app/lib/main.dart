import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'features/auth/providers/auth_providers.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/home/screens/home_screen.dart';

void main() {
  runApp(const ProviderScope(child: VirtualShopApp()));
}

class VirtualShopApp extends StatelessWidget {
  const VirtualShopApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'VirtualShop',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF064B95),
        scaffoldBackgroundColor: const Color(0xFFFCFAFA),
        useMaterial3: true,
      ),
      home: const AuthGate(),
    );
  }
}

/// Decides which flow to show based on session state:
/// - loading -> splash
/// - null user -> LoginScreen
/// - logged in -> HomeScreen (categorias + produtos)
class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);

    // Se a sessão terminar (logout ou refresh token recusado) com ecrãs
    // empurrados por cima (detalhe de produto, etc.), volta à raiz para
    // que o LoginScreen fique visível.
    ref.listen(authControllerProvider, (previous, next) {
      final wasLoggedIn = previous?.valueOrNull != null;
      if (wasLoggedIn && next.valueOrNull == null) {
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    });

    return authState.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (error, _) => const LoginScreen(),
      data: (user) {
        if (user == null) return const LoginScreen();
        return HomeScreen(userName: user.name);
      },
    );
  }
}
