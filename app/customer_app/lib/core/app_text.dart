import 'package:material_ui/material_ui.dart';

String appText(BuildContext context, String portuguese, String english) {
  return Localizations.localeOf(context).languageCode == 'en'
      ? english
      : portuguese;
}
