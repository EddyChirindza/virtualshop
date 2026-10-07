import 'package:customer_app/core/app_preferences.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('persists selected language and theme', () async {
    SharedPreferences.setMockInitialValues({});
    final controller = AppPreferencesController();
    await controller.initialized;

    await controller.setLanguage(AppLanguage.english);
    await controller.setThemeMode(ThemeMode.dark);
    controller.dispose();

    final restored = AppPreferencesController();
    await restored.initialized;

    expect(restored.state.language, AppLanguage.english);
    expect(restored.state.locale, const Locale('en'));
    expect(restored.state.themeMode, ThemeMode.dark);
    restored.dispose();
  });
}
