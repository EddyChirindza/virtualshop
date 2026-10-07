import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/app_preferences.dart';
import '../../../core/app_text.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final preferences = ref.watch(appPreferencesProvider);
    final controller = ref.read(appPreferencesProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: Text(appText(context, 'Definições', 'Settings'))),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            appText(context, 'Idioma', 'Language'),
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          SegmentedButton<AppLanguage>(
            segments: [
              ButtonSegment(
                value: AppLanguage.portuguese,
                label: const Text('Português'),
                icon: const Icon(Icons.translate),
              ),
              const ButtonSegment(
                value: AppLanguage.english,
                label: Text('English'),
                icon: Icon(Icons.translate),
              ),
            ],
            selected: {preferences.language},
            onSelectionChanged: (selection) {
              controller.setLanguage(selection.first);
            },
          ),
          const SizedBox(height: 28),
          Text(
            appText(context, 'Tema do aplicativo', 'App theme'),
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          SegmentedButton<ThemeMode>(
            segments: [
              ButtonSegment(
                value: ThemeMode.light,
                label: Text(appText(context, 'Claro', 'Light')),
                icon: const Icon(Icons.light_mode_outlined),
              ),
              ButtonSegment(
                value: ThemeMode.dark,
                label: Text(appText(context, 'Escuro', 'Dark')),
                icon: const Icon(Icons.dark_mode_outlined),
              ),
            ],
            selected: {preferences.themeMode},
            onSelectionChanged: (selection) {
              controller.setThemeMode(selection.first);
            },
          ),
        ],
      ),
    );
  }
}
