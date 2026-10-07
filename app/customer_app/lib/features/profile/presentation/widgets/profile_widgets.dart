import 'package:flutter/material.dart';

import '../../../../core/app_text.dart';
import '../../domain/models/profile.dart';
import '../../domain/models/profile_address.dart';
import '../../domain/models/profile_stats.dart';

class ProfileCard extends StatelessWidget {
  const ProfileCard({
    required this.profile,
    required this.onTap,
    required this.onCameraTap,
    super.key,
  });

  final Profile profile;
  final VoidCallback onTap;
  final VoidCallback onCameraTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final initials = profile.fullName
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .take(2)
        .map((part) => part[0].toUpperCase())
        .join();

    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: theme.colorScheme.primaryContainer,
                    foregroundImage: profile.photoUrl == null
                        ? null
                        : NetworkImage(profile.photoUrl!),
                    onForegroundImageError: profile.photoUrl == null
                        ? null
                        : (_, _) {},
                    child: Text(
                      initials.isEmpty ? '?' : initials,
                      style: theme.textTheme.titleLarge?.copyWith(
                        color: theme.colorScheme.onPrimaryContainer,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  Positioned(
                    right: -2,
                    bottom: -2,
                    child: Material(
                      color: theme.colorScheme.primary,
                      shape: const CircleBorder(),
                      child: IconButton(
                        tooltip: appText(
                          context,
                          'Alterar fotografia',
                          'Change photo',
                        ),
                        visualDensity: VisualDensity.compact,
                        constraints: const BoxConstraints.tightFor(
                          width: 34,
                          height: 34,
                        ),
                        onPressed: onCameraTap,
                        icon: const Icon(Icons.camera_alt_outlined, size: 17),
                        color: theme.colorScheme.onPrimary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      profile.fullName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 5),
                    _ContactLine(
                      icon: Icons.email_outlined,
                      text: profile.email,
                    ),
                    if (profile.phone?.isNotEmpty == true)
                      _ContactLine(
                        icon: Icons.phone_outlined,
                        text: profile.phone!,
                      ),
                    if (profile.isVerified) ...[
                      const SizedBox(height: 8),
                      const _VerifiedBadge(),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 4),
              Icon(Icons.chevron_right, color: theme.colorScheme.outline),
            ],
          ),
        ),
      ),
    );
  }
}

class _ContactLine extends StatelessWidget {
  const _ContactLine({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 3),
    child: Row(
      children: [
        Icon(icon, size: 15, color: Theme.of(context).colorScheme.outline),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
      ],
    ),
  );
}

class _VerifiedBadge extends StatelessWidget {
  const _VerifiedBadge();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: colors.secondaryContainer,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.verified, size: 14, color: colors.onSecondaryContainer),
          const SizedBox(width: 5),
          Text(
            appText(context, 'Conta verificada', 'Verified account'),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: colors.onSecondaryContainer,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class ProfileStatsCard extends StatelessWidget {
  const ProfileStatsCard({required this.stats, super.key});

  final ProfileStats stats;

  @override
  Widget build(BuildContext context) {
    final entries = [
      _StatEntry(
        appText(context, 'Pedidos', 'Orders'),
        '${stats.totalOrders}',
        Icons.receipt_long_outlined,
      ),
      _StatEntry(
        appText(context, 'Total gasto', 'Total spent'),
        _formatMzn(stats.totalSpent),
        Icons.payments_outlined,
      ),
      _StatEntry(
        appText(context, 'Avaliação média', 'Average rating'),
        stats.averageRating?.toStringAsFixed(1) ?? '-',
        Icons.star_outline_rounded,
      ),
      _StatEntry(
        appText(context, 'Favoritos', 'Favorites'),
        '${stats.favoritesCount}',
        Icons.favorite_border,
      ),
    ];
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 17, horizontal: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (final entry in entries)
              Expanded(child: _StatColumn(entry: entry)),
          ],
        ),
      ),
    );
  }

  String _formatMzn(double value) {
    final whole = value.round().toString().replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'),
      (_) => '.',
    );
    return '$whole MZN';
  }
}

class _StatEntry {
  const _StatEntry(this.label, this.value, this.icon);
  final String label;
  final String value;
  final IconData icon;
}

class _StatColumn extends StatelessWidget {
  const _StatColumn({required this.entry});
  final _StatEntry entry;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 2),
    child: Column(
      children: [
        Icon(
          entry.icon,
          size: 19,
          color: Theme.of(context).colorScheme.primary,
        ),
        const SizedBox(height: 7),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            entry.value,
            maxLines: 1,
            style: Theme.of(context).textTheme.titleSmall
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
        const SizedBox(height: 3),
        Text(
          entry.label,
          textAlign: TextAlign.center,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.labelSmall,
        ),
      ],
    ),
  );
}

class ProfileSectionCard extends StatelessWidget {
  const ProfileSectionCard({
    required this.title,
    required this.actionLabel,
    required this.onAction,
    required this.child,
    super.key,
  });

  final String title;
  final String actionLabel;
  final VoidCallback onAction;
  final Widget child;

  @override
  Widget build(BuildContext context) => Card(
    margin: EdgeInsets.zero,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 13, 8, 4),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              TextButton(onPressed: onAction, child: Text(actionLabel)),
            ],
          ),
        ),
        child,
      ],
    ),
  );
}

class AddressListTile extends StatelessWidget {
  const AddressListTile({
    required this.address,
    required this.onTap,
    super.key,
  });

  final ProfileAddress address;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final icon = switch (address.label.trim().toLowerCase()) {
      'casa' => Icons.home_outlined,
      'trabalho' => Icons.work_outline,
      _ => Icons.location_on_outlined,
    };
    return ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
        child: Icon(icon, color: Theme.of(context).colorScheme.primary),
      ),
      title: Row(
        children: [
          Flexible(
            child: Text(
              address.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (address.isDefault) ...[
            const SizedBox(width: 7),
            const _DefaultBadge(),
          ],
        ],
      ),
      subtitle: Text(
        address.summary,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: const Icon(Icons.chevron_right),
    );
  }
}

class _DefaultBadge extends StatelessWidget {
  const _DefaultBadge();

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.primaryContainer,
      borderRadius: BorderRadius.circular(12),
    ),
    child: Text(
      appText(context, 'Padrão', 'Default'),
      style: Theme.of(context).textTheme.labelSmall
          ?.copyWith(color: Theme.of(context).colorScheme.onPrimaryContainer),
    ),
  );
}
