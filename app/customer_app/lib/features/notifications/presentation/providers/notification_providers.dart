import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/providers.dart';
import '../../data/notification_repository.dart';
import '../../domain/notification.dart';

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return NotificationRepository(dio: ref.watch(dioProvider));
});

final notificationsProvider =
    AsyncNotifierProvider<NotificationsController, List<ShopNotification>>(
      NotificationsController.new,
    );

final unreadNotificationCountProvider =
    AsyncNotifierProvider<UnreadNotificationCountController, int>(
      UnreadNotificationCountController.new,
    );

class NotificationsController extends AsyncNotifier<List<ShopNotification>> {
  static const _pageSize = 30;
  var _page = 1;
  var _hasMore = true;

  @override
  Future<List<ShopNotification>> build() async {
    _page = 1;
    _hasMore = true;
    final result = await ref
        .read(notificationRepositoryProvider)
        .fetchNotifications(page: _page, limit: _pageSize);
    _hasMore = result.hasMore;
    return result.items;
  }

  Future<void> refresh() async {
    _page = 1;
    _hasMore = true;
    state = await AsyncValue.guard(() async {
      final result = await ref
          .read(notificationRepositoryProvider)
          .fetchNotifications(page: _page, limit: _pageSize);
      _hasMore = result.hasMore;
      return result.items;
    });
    ref.invalidate(unreadNotificationCountProvider);
  }

  Future<void> loadMore() async {
    if (!_hasMore || state.isLoading) return;
    final current = state.valueOrNull ?? const <ShopNotification>[];
    final nextPage = _page + 1;
    try {
      final result = await ref
          .read(notificationRepositoryProvider)
          .fetchNotifications(page: nextPage, limit: _pageSize);
      final ids = current.map((item) => item.id).toSet();
      state = AsyncData([
        ...current,
        ...result.items.where((item) => !ids.contains(item.id)),
      ]);
      _page = nextPage;
      _hasMore = result.hasMore;
    } catch (_) {
      state = AsyncData(current);
      rethrow;
    }
  }

  Future<void> markAsRead(String id) async {
    final current = state.valueOrNull ?? const <ShopNotification>[];
    final old = state;
    state = AsyncData([
      for (final item in current)
        item.id == id ? item.copyWith(isRead: true) : item,
    ]);
    ref.invalidate(unreadNotificationCountProvider);
    try {
      await ref.read(notificationRepositoryProvider).markAsRead(id);
      ref.invalidate(unreadNotificationCountProvider);
    } catch (_) {
      state = old;
      ref.invalidate(unreadNotificationCountProvider);
      rethrow;
    }
  }

  Future<void> markAllAsRead() async {
    final current = state.valueOrNull ?? const <ShopNotification>[];
    final old = state;
    state = AsyncData([
      for (final item in current) item.copyWith(isRead: true),
    ]);
    ref.invalidate(unreadNotificationCountProvider);
    try {
      await ref.read(notificationRepositoryProvider).markAllAsRead();
      ref.invalidate(unreadNotificationCountProvider);
    } catch (_) {
      state = old;
      ref.invalidate(unreadNotificationCountProvider);
      rethrow;
    }
  }
}

class UnreadNotificationCountController extends AsyncNotifier<int> {
  Timer? _timer;

  @override
  Future<int> build() async {
    ref.onDispose(() => _timer?.cancel());
    _timer = Timer.periodic(const Duration(seconds: 60), (_) => refresh());
    return ref.read(notificationRepositoryProvider).fetchUnreadCount();
  }

  Future<void> refresh() async {
    state = await AsyncValue.guard(
      () => ref.read(notificationRepositoryProvider).fetchUnreadCount(),
    );
  }
}
