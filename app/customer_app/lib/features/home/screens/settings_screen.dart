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
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.translate),
            title: Text(appText(context, 'Idioma', 'Language')),
            subtitle: Text(
              preferences.language == AppLanguage.portuguese
                  ? 'Português'
                  : 'English',
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => showDialog<void>(
              context: context,
              builder: (dialogContext) => SimpleDialog(
                title: Text(appText(context, 'Idioma', 'Language')),
                children: [
                  _PreferenceOption(
                    label: 'Português',
                    selected: preferences.language == AppLanguage.portuguese,
                    onPressed: () {
                      controller.setLanguage(AppLanguage.portuguese);
                      Navigator.pop(dialogContext);
                    },
                  ),
                  _PreferenceOption(
                    label: 'English',
                    selected: preferences.language == AppLanguage.english,
                    onPressed: () {
                      controller.setLanguage(AppLanguage.english);
                      Navigator.pop(dialogContext);
                    },
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 1),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(
              preferences.themeMode == ThemeMode.dark
                  ? Icons.dark_mode_outlined
                  : Icons.light_mode_outlined,
            ),
            title: Text(appText(context, 'Tema do aplicativo', 'App theme')),
            subtitle: Text(
              preferences.themeMode == ThemeMode.dark
                  ? appText(context, 'Escuro', 'Dark')
                  : appText(context, 'Claro', 'Light'),
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => showDialog<void>(
              context: context,
              builder: (dialogContext) => SimpleDialog(
                title: Text(
                  appText(context, 'Tema do aplicativo', 'App theme'),
                ),
                children: [
                  _PreferenceOption(
                    label: appText(context, 'Claro', 'Light'),
                    icon: Icons.light_mode_outlined,
                    selected: preferences.themeMode == ThemeMode.light,
                    onPressed: () {
                      controller.setThemeMode(ThemeMode.light);
                      Navigator.pop(dialogContext);
                    },
                  ),
                  _PreferenceOption(
                    label: appText(context, 'Escuro', 'Dark'),
                    icon: Icons.dark_mode_outlined,
                    selected: preferences.themeMode == ThemeMode.dark,
                    onPressed: () {
                      controller.setThemeMode(ThemeMode.dark);
                      Navigator.pop(dialogContext);
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PreferenceOption extends StatelessWidget {
  const _PreferenceOption({
    required this.label,
    required this.selected,
    required this.onPressed,
    this.icon,
  });

  final String label;
  final bool selected;
  final VoidCallback onPressed;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => SimpleDialogOption(
    onPressed: onPressed,
    child: Row(
      children: [
        if (icon != null) ...[Icon(icon), const SizedBox(width: 12)],
        Expanded(child: Text(label)),
        if (selected) const Icon(Icons.check, size: 20),
      ],
    ),
  );
}
