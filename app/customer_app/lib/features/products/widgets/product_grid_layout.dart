import 'package:flutter/material.dart';

/// Shared grid sizing for product cards across home, search, categories and
/// favorites. A fixed tile height gives the card's text and actions room to
/// grow when the user increases the system text size.
SliverGridDelegateWithMaxCrossAxisExtent productGridDelegate(
  BuildContext context, {
  required double crossAxisSpacing,
  required double mainAxisSpacing,
}) {
  final textScale = MediaQuery.textScalerOf(context).scale(14) / 14;

  return SliverGridDelegateWithMaxCrossAxisExtent(
    maxCrossAxisExtent: 220,
    mainAxisExtent:
        248.0 + ((textScale - 1).clamp(0.0, 1.0) * 64).toDouble(),
    crossAxisSpacing: crossAxisSpacing,
    mainAxisSpacing: mainAxisSpacing,
  );
}
