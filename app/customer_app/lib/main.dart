import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/app_preferences.dart';
import 'features/auth/providers/auth_providers.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/home/screens/home_screen.dart';

void main() {
  runApp(const ProviderScope(child: VirtualShopApp()));
}

class VirtualShopApp extends ConsumerWidget {
  const VirtualShopApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final preferences = ref.watch(appPreferencesProvider);
    return MaterialApp(
      title: 'VirtualShop',
      debugShowCheckedModeBanner: false,
      locale: preferences.locale,
      supportedLocales: const [Locale('en'), Locale('pt')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF064B95),
        scaffoldBackgroundColor: const Color(0xFFFCFAFA),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF78B7F4),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF111820),
        useMaterial3: true,
      ),
      themeMode: preferences.themeMode,
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
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (error, _) => const LoginScreen(),
      data: (user) {
        if (user == null) return const LoginScreen();
        return HomeScreen(userName: user.name);
      },
    );
  }
}
