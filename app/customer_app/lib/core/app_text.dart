import 'package:flutter/material.dart';

String appText(BuildContext context, String portuguese, String english) {
  return Localizations.localeOf(context).languageCode == 'en'
      ? english
      : portuguese;
}
