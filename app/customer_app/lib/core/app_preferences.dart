import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
      return AppPreferencesController();
    });

class AppPreferencesController extends StateNotifier<AppPreferences> {
  AppPreferencesController() : super(const AppPreferences()) {
    initialized = _restore();
  }

  late final Future<void> initialized;

  static const _languageKey = 'app_language';
  static const _themeKey = 'app_theme_mode';

  Future<void> _restore() async {
    final preferences = await SharedPreferences.getInstance();
    final language = preferences.getString(_languageKey);
    final theme = preferences.getString(_themeKey);
    state = AppPreferences(
      language: language == 'en' ? AppLanguage.english : AppLanguage.portuguese,
      themeMode: theme == 'dark' ? ThemeMode.dark : ThemeMode.light,
    );
  }

  Future<void> setLanguage(AppLanguage language) async {
    await initialized;
    state = state.copyWith(language: language);
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _languageKey,
      language == AppLanguage.english ? 'en' : 'pt',
    );
  }

  Future<void> setThemeMode(ThemeMode themeMode) async {
    await initialized;
    state = state.copyWith(themeMode: themeMode);
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _themeKey,
      themeMode == ThemeMode.dark ? 'dark' : 'light',
    );
  }
}
