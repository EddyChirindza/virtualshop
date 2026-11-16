import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'session/session_controller.dart';

enum AppLanguage { portuguese, english }

class AppPreferences {
  const AppPreferences({
    this.language = AppLanguage.portuguese,
    this.themeMode = ThemeMode.light,
  });

  final AppLanguage language;
  final ThemeMode themeMode;

  Locale get locale => Locale(language == AppLanguage.english ? 'en' : 'pt');

  AppPreferences copyWith({AppLanguage? language, ThemeMode? themeMode}) =>
      AppPreferences(
        language: language ?? this.language,
        themeMode: themeMode ?? this.themeMode,
      );
}

final appPreferencesProvider =
    StateNotifierProvider<AppPreferencesController, AppPreferences>((ref) {
      final session = ref.watch(sessionControllerProvider);
      return AppPreferencesController(userId: session.userId);
    });

class AppPreferencesController extends StateNotifier<AppPreferences> {
  AppPreferencesController({int? userId})
    : _userId = userId,
      super(const AppPreferences()) {
    initialized = _restore(userId);
  }

  late final Future<void> initialized;
  final int? _userId;

  static String _languageKey(int? userId) =>
      'app_language_${userId ?? 'guest'}';

  static String _themeKey(int? userId) => 'app_theme_mode_${userId ?? 'guest'}';

  Future<void> _restore(int? userId) async {
    final preferences = await SharedPreferences.getInstance();
    final language = preferences.getString(_languageKey(userId));
    final theme = preferences.getString(_themeKey(userId));
    if (!mounted || _userId != userId) return;
    state = AppPreferences(
      language: language == 'en' ? AppLanguage.english : AppLanguage.portuguese,
      themeMode: theme == 'dark' ? ThemeMode.dark : ThemeMode.light,
    );
  }

  Future<void> setLanguage(AppLanguage language) async {
    await initialized;
    if (!mounted) return;
    state = state.copyWith(language: language);
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _languageKey(_userId),
      language == AppLanguage.english ? 'en' : 'pt',
    );
  }

  Future<void> setThemeMode(ThemeMode themeMode) async {
    await initialized;
    if (!mounted) return;
    state = state.copyWith(themeMode: themeMode);
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _themeKey(_userId),
      themeMode == ThemeMode.dark ? 'dark' : 'light',
    );
  }
}
