import 'package:flutter/material.dart';

import '../core/app_text.dart';
import '../theme/app_theme.dart';

class AppIconButton extends StatelessWidget {
  const AppIconButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
    super.key,
    this.backgroundColor = AppColors.surface,
    this.foregroundColor = AppColors.ink,
    this.size = 44,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;
  final Color backgroundColor;
  final Color foregroundColor;
  final double size;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: tooltip,
    child: Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(AppRadius.iconButton),
        boxShadow: backgroundColor == AppColors.surface
            ? AppShadows.soft
            : null,
      ),
      child: IconButton(
        tooltip: tooltip,
        onPressed: onPressed,
        color: foregroundColor,
        icon: Icon(icon),
      ),
    ),
  );
}

class AppPageHeader extends StatelessWidget {
  const AppPageHeader({
    required this.userName,
    required this.title,
    required this.onMenu,
    super.key,
    this.isHome = false,
    this.onNotifications,
    this.unreadNotificationCount = 0,
  });

  final String userName;
  final String title;
  final VoidCallback onMenu;
  final VoidCallback? onNotifications;
  final int unreadNotificationCount;
  final bool isHome;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: 48,
    child: Row(
      children: [
        AppIconButton(
          icon: Icons.menu_rounded,
          tooltip: appText(context, 'Abrir menu', 'Open menu'),
          onPressed: onMenu,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: isHome
              ? Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      appText(context, 'Bem-vindo à', 'Welcome to'),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    Text(
                      'VirtualShop',
                      style: Theme.of(context).textTheme.titleLarge
                          ?.copyWith(color: AppColors.brand, fontSize: 20),
                    ),
                  ],
                )
              : Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleLarge
                      ?.copyWith(color: AppColors.ink),
                ),
        ),
        if (isHome)
          _NotificationButton(
            onPressed: onNotifications,
            unreadCount: unreadNotificationCount,
          )
        else
          const SizedBox(width: 44),
      ],
    ),
  );
}

class _NotificationButton extends StatelessWidget {
  const _NotificationButton({
    required this.onPressed,
    required this.unreadCount,
  });

  final VoidCallback? onPressed;
  final int unreadCount;

  @override
  Widget build(BuildContext context) => Stack(
    clipBehavior: Clip.none,
    children: [
      AppIconButton(
        icon: Icons.notifications_none_rounded,
        tooltip: appText(context, 'Notificações', 'Notifications'),
        onPressed: onPressed,
      ),
      if (unreadCount > 0)
        Positioned(
          top: -3,
          right: -5,
          child: Container(
            constraints: const BoxConstraints(minWidth: 19, minHeight: 19),
            padding: const EdgeInsets.symmetric(horizontal: 4),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.accent,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.surface, width: 2),
            ),
            child: Text(
              unreadCount > 99 ? '99+' : '$unreadCount',
              style: const TextStyle(
                color: AppColors.surface,
                fontSize: 9,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
    ],
  );
}

class AppSearchField extends StatelessWidget {
  const AppSearchField({
    super.key,
    this.controller,
    this.focusNode,
    this.onChanged,
    this.onSubmitted,
    this.onClear,
    this.onFilter,
    this.filterCount = 0,
    this.hintText,
  });

  final TextEditingController? controller;
  final FocusNode? focusNode;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final VoidCallback? onClear;
  final VoidCallback? onFilter;
  final int filterCount;
  final String? hintText;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Container(
          height: 52,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.field),
            boxShadow: AppShadows.soft,
          ),
          child: TextField(
            controller: controller,
            focusNode: focusNode,
            onChanged: onChanged,
            onSubmitted: onSubmitted,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText:
                  hintText ??
                  appText(context, 'Pesquisar produtos', 'Search products'),
              prefixIcon: const Icon(
                Icons.search_rounded,
                color: AppColors.secondaryText,
              ),
              suffixIcon: onClear == null || controller?.text.isEmpty != false
                  ? null
                  : IconButton(
                      tooltip: appText(
                        context,
                        'Limpar pesquisa',
                        'Clear search',
                      ),
                      onPressed: onClear,
                      icon: const Icon(Icons.close_rounded),
                    ),
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
      ),
      if (onFilter != null) ...[
        const SizedBox(width: 10),
        SizedBox(
          width: 52,
          height: 52,
          child: FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.brand,
              foregroundColor: AppColors.surface,
              padding: EdgeInsets.zero,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.field),
              ),
            ),
            onPressed: onFilter,
            child: Badge(
              isLabelVisible: filterCount > 0,
              backgroundColor: AppColors.accent,
              textColor: AppColors.accentText,
              label: Text('$filterCount'),
              child: const Icon(Icons.tune_rounded),
            ),
          ),
        ),
      ],
    ],
  );
}

class CategoryChip extends StatelessWidget {
  const CategoryChip({
    required this.label,
    required this.onPressed,
    super.key,
    this.selected = false,
  });

  final String label;
  final VoidCallback onPressed;
  final bool selected;

  @override
  Widget build(BuildContext context) => Material(
    color: selected ? AppColors.ink : AppColors.surface,
    borderRadius: BorderRadius.circular(AppRadius.pill),
    elevation: 0,
    shadowColor: AppColors.ink.withValues(alpha: 0.06),
    child: DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.pill),
        boxShadow: selected ? null : AppShadows.soft,
      ),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        child: SizedBox(
          height: 40,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Center(
              child: Text(
                label,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: selected ? AppColors.surface : AppColors.ink,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

class PromoBanner extends StatelessWidget {
  const PromoBanner({super.key});

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(24),
    child: SizedBox(
      height: 156,
      child: Stack(
        children: [
          const Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.brand, AppColors.brandLight],
                  begin: Alignment.bottomLeft,
                  end: Alignment.topRight,
                ),
              ),
            ),
          ),
          Positioned(
            top: -38,
            right: -30,
            child: _BannerCircle(size: 132, opacity: 0.10),
          ),
          Positioned(
            bottom: -54,
            right: 88,
            child: _BannerCircle(size: 112, opacity: 0.12),
          ),
          Positioned(
            left: 20,
            top: 16,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: AppColors.accent,
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                child: Text(
                  appText(context, 'Promoção de Verão', 'Summer Sale'),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: AppColors.accentText,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            left: 20,
            top: 47,
            child: Text(
              appText(
                context,
                'Eletrónicos\naté 45% OFF',
                'Electronics\nup to 45% OFF',
              ),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: AppColors.surface,
                fontSize: 22,
                height: 1.0,
              ),
            ),
          ),
          Positioned(
            left: 20,
            bottom: 16,
            child: Material(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.pill),
              child: InkWell(
                onTap: () {},
                borderRadius: BorderRadius.circular(AppRadius.pill),
                child: SizedBox(
                  height: 36,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Center(
                      child: Text(
                        appText(context, 'Comprar agora', 'Shop now'),
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: AppColors.brand,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class _BannerCircle extends StatelessWidget {
  const _BannerCircle({required this.size, required this.opacity});

  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: AppColors.surface.withValues(alpha: opacity),
      shape: BoxShape.circle,
    ),
  );
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({
    required this.title,
    required this.actionLabel,
    required this.onAction,
    super.key,
  });

  final String title;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Expanded(
        child: Text(title, style: Theme.of(context).textTheme.titleLarge),
      ),
      TextButton(
        onPressed: onAction,
        style: TextButton.styleFrom(foregroundColor: AppColors.brand),
        child: Text(
          actionLabel,
          style: Theme.of(context).textTheme.labelLarge
              ?.copyWith(color: AppColors.brand, fontWeight: FontWeight.w600),
        ),
      ),
    ],
  );
}

class FloatingBottomNav extends StatelessWidget {
  const FloatingBottomNav({
    required this.selectedIndex,
    required this.cartItemCount,
    required this.onSelected,
    super.key,
  });

  final int selectedIndex;
  final int cartItemCount;
  final ValueChanged<int> onSelected;

  static const _items = [
    (Icons.home_outlined, Icons.home_rounded, 'Início', 'Home'),
    (Icons.search_rounded, Icons.search_rounded, 'Pesquisar', 'Search'),
    (Icons.shopping_cart_outlined, Icons.shopping_cart, 'Carrinho', 'Cart'),
    (Icons.person_outline_rounded, Icons.person_rounded, 'Perfil', 'Profile'),
  ];

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
    child: Container(
      height: 68,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: AppColors.ink,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        boxShadow: AppShadows.navigation,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          for (var index = 0; index < _items.length; index++)
            _NavItem(
              index: index,
              item: _items[index],
              selected: selectedIndex == index,
              cartItemCount: cartItemCount,
              onSelected: onSelected,
            ),
        ],
      ),
    ),
  );
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.index,
    required this.item,
    required this.selected,
    required this.cartItemCount,
    required this.onSelected,
  });

  final int index;
  final (IconData, IconData, String, String) item;
  final bool selected;
  final int cartItemCount;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    final label = appText(context, item.$3, item.$4);
    final icon = Icon(
      selected ? item.$2 : item.$1,
      size: 22,
      color: selected ? AppColors.ink : AppColors.inactiveOnDark,
    );
    final content = index == 2 && cartItemCount > 0
        ? Badge(
            backgroundColor: AppColors.accent,
            textColor: AppColors.accentText,
            label: Text(cartItemCount > 99 ? '99+' : '$cartItemCount'),
            child: icon,
          )
        : icon;

    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: InkWell(
        onTap: () => onSelected(index),
        borderRadius: BorderRadius.circular(AppRadius.pill),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOutCubic,
          height: 48,
          padding: EdgeInsets.symmetric(horizontal: selected ? 18 : 12),
          decoration: BoxDecoration(
            color: selected ? AppColors.surface : Colors.transparent,
            borderRadius: BorderRadius.circular(AppRadius.pill),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              content,
              if (selected) ...[
                const SizedBox(width: 8),
                Text(
                  label,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: AppColors.ink,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
