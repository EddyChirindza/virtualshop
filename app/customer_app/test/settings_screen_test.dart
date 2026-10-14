import 'package:customer_app/core/app_preferences.dart';
import 'package:customer_app/features/home/screens/settings_screen.dart';
import 'package:customer_app/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('settings choices open on tap and apply selections', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(
      ProviderScope(
        child: Consumer(
          builder: (context, ref, _) {
            final preferences = ref.watch(appPreferencesProvider);
            return MaterialApp(
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
              home: const SettingsScreen(),
            );
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('English'), findsNothing);
    expect(find.byType(SegmentedButton<AppLanguage>), findsNothing);

    await tester.tap(find.text('Idioma'));
    await tester.pumpAndSettle();
    expect(find.text('English'), findsOneWidget);

    await tester.tap(find.text('English'));
    await tester.pumpAndSettle();
    expect(find.text('Language'), findsOneWidget);

    await tester.tap(find.text('App theme'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Dark'));
    await tester.pumpAndSettle();

    expect(
      Theme.of(tester.element(find.byType(SettingsScreen))).brightness,
      Brightness.dark,
    );
    expect(AppTheme.dark.brightness, Brightness.dark);
    expect(
      AppTheme.dark.scaffoldBackgroundColor,
      isNot(AppTheme.light.scaffoldBackgroundColor),
    );
  });
}
