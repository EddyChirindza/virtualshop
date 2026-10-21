import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_text.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/errors/api_exception.dart';
import '../../../../core/widgets/error_retry.dart';
import '../../../products/screens/product_detail_screen.dart';
import '../../domain/notification.dart';
import '../providers/notification_providers.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  final _scrollController = ScrollController();
  var _loadingMore = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(notificationsProvider.notifier).refresh();
    });
  }

  @override
  void dispose() {
    _scrollController
      ..removeListener(_onScroll)
      ..dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.extentAfter > 300 || _loadingMore) return;
    _loadingMore = true;
    ref
        .read(notificationsProvider.notifier)
        .loadMore()
        .catchError((_) {
          if (mounted) {
            _notice(
              appText(
                context,
                'Não foi possível carregar mais notificações.',
                'Could not load more notifications.',
              ),
            );
          }
        })
        .whenComplete(() {
          if (mounted) setState(() => _loadingMore = false);
        });
  }

  Future<void> _open(ShopNotification notification) async {
    try {
      if (!notification.isRead) {
        await ref
            .read(notificationsProvider.notifier)
            .markAsRead(notification.id);
      }
      if (!mounted) return;
      if (notification.productId != null) {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) =>
                ProductDetailScreen(productId: notification.productId!),
          ),
        );
      }
    } on ApiException catch (error) {
      if (mounted) _notice(error.message);
    } catch (_) {
      if (mounted) {
        _notice(
          appText(
            context,
            'Não foi possível abrir a notificação.',
            'Could not open the notification.',
          ),
        );
      }
    }
  }

  Future<void> _markAll() async {
    try {
      await ref.read(notificationsProvider.notifier).markAllAsRead();
    } on ApiException catch (error) {
      if (mounted) _notice(error.message);
    } catch (_) {
      if (mounted) {
        _notice(
          appText(
            context,
            'Não foi possível atualizar as notificações.',
            'Could not update notifications.',
          ),
        );
      }
    }
  }

  void _notice(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final notifications = ref.watch(notificationsProvider);
    final unreadCount =
        ref.watch(unreadNotificationCountProvider).valueOrNull ?? 0;
    return Scaffold(
      appBar: AppBar(
        title: Text(appText(context, 'Notificações', 'Notifications')),
        actions: [
          if (unreadCount > 0)
            TextButton(
              onPressed: _markAll,
              child: Text(
                appText(context, 'Marcar todas como lidas', 'Mark all read'),
              ),
            ),
        ],
      ),
      body: notifications.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorRetry(
          message: error is ApiException
              ? error.message
              : appText(
                  context,
                  'Não foi possível carregar as notificações.',
                  'Could not load notifications.',
                ),
          onRetry: () => ref.read(notificationsProvider.notifier).refresh(),
        ),
        data: (items) => items.isEmpty
            ? _EmptyNotifications(
                onRefresh: () =>
                    ref.read(notificationsProvider.notifier).refresh(),
              )
            : RefreshIndicator(
                onRefresh: () =>
                    ref.read(notificationsProvider.notifier).refresh(),
                child: ListView.separated(
                  controller: _scrollController,
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                  itemCount: items.length + (_loadingMore ? 1 : 0),
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    if (index == items.length) {
                      return const Padding(
                        padding: EdgeInsets.all(16),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }
                    return _NotificationTile(
                      notification: items[index],
                      onTap: () => _open(items[index]),
                    );
                  },
                ),
              ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification, required this.onTap});

  final ShopNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final unreadColor = theme.colorScheme.primary;
    return Material(
      color: notification.isRead
          ? theme.colorScheme.surface
          : theme.colorScheme.primaryContainer.withValues(alpha: 0.35),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (notification.imageUrl?.isNotEmpty == true)
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.network(
                    ApiConstants.resolveImageUrl(notification.imageUrl!),
                    width: 58,
                    height: 58,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => _typeIcon(context),
                  ),
                )
              else
                _typeIcon(context),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            notification.title,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: notification.isRead
                                  ? FontWeight.w500
                                  : FontWeight.w700,
                            ),
                          ),
                        ),
                        if (!notification.isRead)
                          Container(
                            width: 9,
                            height: 9,
                            decoration: BoxDecoration(
                              color: unreadColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      notification.message,
                      style: theme.textTheme.bodyMedium,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 7),
                    Text(
                      _dateLabel(context, notification.createdAt),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _typeIcon(BuildContext context) => Container(
    width: 58,
    height: 58,
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.secondaryContainer,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Icon(
      _iconForType(notification.type),
      color: Theme.of(context).colorScheme.onSecondaryContainer,
    ),
  );

  IconData _iconForType(String type) => switch (type.toLowerCase()) {
    'new_product' || 'product' => Icons.inventory_2_outlined,
    'promotion' || 'discount' => Icons.local_offer_outlined,
    'product_alert' || 'alert' => Icons.notifications_active_outlined,
    _ => Icons.info_outline,
  };

  String _dateLabel(BuildContext context, DateTime? date) {
    if (date == null) return appText(context, 'Agora', 'Just now');
    final local = date.toLocal();
    final now = DateTime.now();
    final sameDay =
        local.year == now.year &&
        local.month == now.month &&
        local.day == now.day;
    final time =
        '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
    return sameDay
        ? appText(context, 'Hoje, $time', 'Today, $time')
        : '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year} · $time';
  }
}

class _EmptyNotifications extends StatelessWidget {
  const _EmptyNotifications({required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          Icons.notifications_none_rounded,
          size: 48,
          color: Theme.of(context).colorScheme.outline,
        ),
        const SizedBox(height: 12),
        Text(
          appText(
            context,
            'Ainda não tens notificações.',
            'You have no notifications yet.',
          ),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: onRefresh,
          child: Text(appText(context, 'Atualizar', 'Refresh')),
        ),
      ],
    ),
  );
}
