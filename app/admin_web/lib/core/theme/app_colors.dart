import 'package:flutter/material.dart';

abstract final class AppColors {
  static const background = Color(0xFFF3F4F8);
  static const surface = Colors.white;
  static const textPrimary = Color(0xFF202232);
  static const textSecondary = Color(0xFF8A8FA3);
  static const border = Color(0xFFEDEEF3);
  static const accentStart = Color(0xFFD946EF);
  static const accentEnd = Color(0xFF7C3AED);
  static const accentBlue = Color(0xFF3B82F6);
  static const accentSurface = Color(0xFFF1E8FC);
  static const accentSurfaceBlue = Color(0xFFEAF0FF);
  static const accentSurfaceViolet = Color(0xFFEEEAFE);
  static const successSurface = Color(0xFFE8F8F1);
  static const warningSurface = Color(0xFFFFF3E8);
  static const dangerSurface = Color(0xFFFEF3F2);
  static const info = Color(0xFF087E8B);
  static const infoSurface = Color(0xFFEAF7FB);
  static const warning = Color(0xFFB54708);
  static const success = Color(0xFF12805C);
  static const shadow = Color(0x120D1026);
  static const danger = Color(0xFFB42318);
  static const neutralSurface = Color(0xFFF2F4F7);
  static const subtleSurface = Color(0xFFF9FAFB);

  static const accentGradient = LinearGradient(
    colors: [accentStart, accentEnd],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );
  static const bannerGradient = LinearGradient(
    colors: [Color(0xFFD946EF), Color(0xFF8B45D8), Color(0xFF4167E8)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
