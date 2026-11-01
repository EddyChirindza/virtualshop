import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/providers.dart';
import '../../../../core/session/session_controller.dart';
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
    final session = ref.watch(sessionControllerProvider);
    _page = 1;
    _hasMore = true;
    if (!session.isActive) return const <ShopNotification>[];

    final generation = session.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    final result = await ref
        .read(notificationRepositoryProvider)
        .fetchNotifications(page: _page, limit: _pageSize);
    if (!sessionController.isCurrent(generation)) {
      return const <ShopNotification>[];
    }
    _hasMore = result.hasMore;
    return result.items;
  }

  Future<void> refresh() async {
    final session = ref.read(sessionControllerProvider);
    _page = 1;
    _hasMore = true;
    if (!session.isActive) {
      state = const AsyncData(<ShopNotification>[]);
      return;
    }

    final generation = session.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    final result = await AsyncValue.guard(() async {
      final page = await ref
          .read(notificationRepositoryProvider)
          .fetchNotifications(page: _page, limit: _pageSize);
      if (!sessionController.isCurrent(generation)) {
        return const <ShopNotification>[];
      }
      _hasMore = page.hasMore;
      return page.items;
    });
    if (!sessionController.isCurrent(generation)) return;
    state = result;
    ref.invalidate(unreadNotificationCountProvider);
  }

  Future<void> loadMore() async {
    final session = ref.read(sessionControllerProvider);
    if (!session.isActive || !_hasMore || state.isLoading) {
      return;
    }

    final generation = session.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    final current = state.valueOrNull ?? const <ShopNotification>[];
    final nextPage = _page + 1;
    try {
      final result = await ref
          .read(notificationRepositoryProvider)
          .fetchNotifications(page: nextPage, limit: _pageSize);
      if (!sessionController.isCurrent(generation)) return;
      final ids = current.map((item) => item.id).toSet();
      state = AsyncData([
        ...current,
        ...result.items.where((item) => !ids.contains(item.id)),
      ]);
      _page = nextPage;
      _hasMore = result.hasMore;
    } catch (_) {
      if (!sessionController.isCurrent(generation)) return;
      state = AsyncData(current);
      rethrow;
    }
  }

  Future<void> markAsRead(String id) async {
    final session = ref.read(sessionControllerProvider);
    if (!session.isActive) return;
    final generation = session.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    final current = state.valueOrNull ?? const <ShopNotification>[];
    final old = state;
    state = AsyncData([
      for (final item in current)
        item.id == id ? item.copyWith(isRead: true) : item,
    ]);
    ref.invalidate(unreadNotificationCountProvider);
    try {
      await ref.read(notificationRepositoryProvider).markAsRead(id);
      if (!sessionController.isCurrent(generation)) return;
      ref.invalidate(unreadNotificationCountProvider);
    } catch (_) {
      if (!sessionController.isCurrent(generation)) return;
      state = old;
      ref.invalidate(unreadNotificationCountProvider);
      rethrow;
    }
  }

  Future<void> markAllAsRead() async {
    final session = ref.read(sessionControllerProvider);
    if (!session.isActive) return;
    final generation = session.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    final current = state.valueOrNull ?? const <ShopNotification>[];
    final old = state;
    state = AsyncData([
      for (final item in current) item.copyWith(isRead: true),
    ]);
    ref.invalidate(unreadNotificationCountProvider);
    try {
      await ref.read(notificationRepositoryProvider).markAllAsRead();
      if (!sessionController.isCurrent(generation)) return;
      ref.invalidate(unreadNotificationCountProvider);
    } catch (_) {
      if (!sessionController.isCurrent(generation)) return;
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
    final session = ref.watch(sessionControllerProvider);
    _timer?.cancel();
    ref.onDispose(() => _timer?.cancel());
    if (!session.isActive) return 0;

    final generation = session.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    _timer = Timer.periodic(const Duration(seconds: 60), (_) {
      if (sessionController.isCurrent(generation)) refresh();
    });

    final count = await ref
        .read(notificationRepositoryProvider)
        .fetchUnreadCount();
    if (!sessionController.isCurrent(generation)) return 0;
    return count;
  }

  Future<void> refresh() async {
    final session = ref.read(sessionControllerProvider);
    if (!session.isActive) {
      state = const AsyncData(0);
      return;
    }

    final generation = session.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    final result = await AsyncValue.guard(
      () => ref.read(notificationRepositoryProvider).fetchUnreadCount(),
    );
    if (!sessionController.isCurrent(generation)) return;
    state = result;
  }
}
