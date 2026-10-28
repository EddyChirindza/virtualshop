import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/app_preferences.dart';
import 'features/auth/providers/auth_providers.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/home/screens/home_screen.dart';
import 'features/products/screens/product_detail_screen.dart';
import 'theme/app_theme.dart';

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
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: preferences.themeMode,
      home: const AuthGate(),
      onGenerateRoute: (settings) {
        final match = RegExp(r'^/products/(\d+)$')
            .firstMatch(settings.name ?? '');
        if (match == null) return null;
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) =>
              ProductDetailScreen(productId: int.parse(match.group(1)!)),
        );
      },
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
        // The web storefront is browsable without an account. Protected
        // operations remain guarded by the existing auth-aware repositories.
        if (user == null && !kIsWeb) return const LoginScreen();
        return HomeScreen(userName: user?.name ?? 'Visitante');
      },
    );
  }
}
