import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

abstract final class AppColors {
  static const background = Color(0xFFF5F7FB);
  static const surface = Color(0xFFFFFFFF);
  static const ink = Color(0xFF0F1B33);
  static const secondaryText = Color(0xFF5B6478);
  static const brand = Color(0xFF0B3D91);
  static const brandLight = Color(0xFF1E6FD9);
  static const accent = Color(0xFFFF8A2A);
  static const accentText = Color(0xFF2B1400);
  static const inactiveOnDark = Color(0xFFC9D3E8);
  static const imagePlaceholder = Color(0xFFE6ECF7);
  static const imagePlaceholderIcon = Color(0xFF7C8BAA);
}

abstract final class AppRadius {
  static const card = 20.0;
  static const field = 16.0;
  static const iconButton = 14.0;
  static const image = 14.0;
  static const pill = 999.0;
}

abstract final class AppShadows {
  static const soft = [
    BoxShadow(color: Color(0x0F0F1B33), blurRadius: 8, offset: Offset(0, 2)),
  ];
  static const product = [
    BoxShadow(color: Color(0x120F1B33), blurRadius: 14, offset: Offset(0, 4)),
  ];
  static const navigation = [
    BoxShadow(color: Color(0x4D000000), blurRadius: 28, offset: Offset(0, 12)),
  ];
}

abstract final class AppTheme {
  static ThemeData get light {
    final scheme =
        ColorScheme.fromSeed(
          seedColor: AppColors.brand,
          surface: AppColors.surface,
        ).copyWith(
          primary: AppColors.brand,
          onPrimary: AppColors.surface,
          secondary: AppColors.brandLight,
          onSurface: AppColors.ink,
          onSurfaceVariant: AppColors.secondaryText,
          surfaceContainerHighest: AppColors.imagePlaceholder,
          error: const Color(0xFFB3261E),
        );
    final textTheme = ThemeData.light().textTheme.apply(
      bodyColor: AppColors.ink,
      displayColor: AppColors.ink,
    );

    return ThemeData(
      useMaterial3: true,
      fontFamily: GoogleFonts.plusJakartaSans().fontFamily,
      colorScheme: scheme,
      scaffoldBackgroundColor: AppColors.background,
      textTheme: textTheme.copyWith(
        titleLarge: textTheme.titleLarge?.copyWith(
          fontSize: 18,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.3,
        ),
        titleMedium: textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w700,
        ),
        titleSmall: textTheme.titleSmall?.copyWith(
          fontSize: 14,
          fontWeight: FontWeight.w700,
        ),
        bodySmall: textTheme.bodySmall?.copyWith(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: AppColors.secondaryText,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 1,
        shadowColor: AppColors.ink.withValues(alpha: 0.06),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.card),
        ),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        hintStyle: textTheme.bodyMedium?.copyWith(
          color: AppColors.secondaryText,
          fontWeight: FontWeight.w500,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.field),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.field),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.field),
          borderSide: BorderSide.none,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.brand,
          foregroundColor: AppColors.surface,
          minimumSize: const Size(44, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.field),
          ),
          textStyle: textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      drawerTheme: DrawerThemeData(
        backgroundColor: AppColors.background,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.horizontal(right: Radius.circular(28)),
        ),
      ),
    );
  }

  static ThemeData get dark {
    const background = Color(0xFF101722);
    const surface = Color(0xFF192331);
    const ink = Color(0xFFF2F5FA);
    const secondaryText = Color(0xFFB2BECE);
    const elevatedSurface = Color(0xFF263446);
    final scheme =
        ColorScheme.fromSeed(
          seedColor: AppColors.brandLight,
          brightness: Brightness.dark,
          surface: surface,
        ).copyWith(
          primary: AppColors.brandLight,
          onPrimary: ink,
          secondary: AppColors.accent,
          onSecondary: AppColors.accentText,
          onSurface: ink,
          onSurfaceVariant: secondaryText,
          surfaceContainerHighest: elevatedSurface,
          error: const Color(0xFFFFB4AB),
        );
    final textTheme = ThemeData.dark().textTheme.apply(
      bodyColor: ink,
      displayColor: ink,
      fontFamily: GoogleFonts.plusJakartaSans().fontFamily,
    );

    return ThemeData.dark().copyWith(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: background,
      textTheme: textTheme.copyWith(
        titleLarge: textTheme.titleLarge?.copyWith(
          fontSize: 18,
          fontWeight: FontWeight.w800,
        ),
        titleMedium: textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w700,
        ),
        titleSmall: textTheme.titleSmall?.copyWith(
          fontSize: 14,
          fontWeight: FontWeight.w700,
        ),
        bodySmall: textTheme.bodySmall?.copyWith(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: secondaryText,
        ),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 1,
        shadowColor: Colors.black.withValues(alpha: 0.24),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.card),
        ),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        hintStyle: textTheme.bodyMedium?.copyWith(
          color: secondaryText,
          fontWeight: FontWeight.w500,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.field),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.field),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.field),
          borderSide: BorderSide.none,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.brandLight,
          foregroundColor: ink,
          minimumSize: const Size(44, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.field),
          ),
          textStyle: textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      drawerTheme: const DrawerThemeData(
        backgroundColor: background,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.horizontal(right: Radius.circular(28)),
        ),
      ),
    );
  }
}
