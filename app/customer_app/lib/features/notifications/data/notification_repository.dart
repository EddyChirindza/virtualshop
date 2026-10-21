import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/api_exception.dart';
import '../domain/notification.dart';

class NotificationRepository {
  NotificationRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<NotificationPage> fetchNotifications({
    int page = 1,
    int limit = 30,
  }) async {
    try {
      final response = await _dio.get(
        ApiConstants.notifications,
        queryParameters: {'page': page, 'limit': limit},
      );
      final body = response.data;
      final payload = body is Map && body.containsKey('data')
          ? body['data']
          : body;
      final List<dynamic> rawItems;
      var hasMore = false;
      if (payload is List) {
        rawItems = payload;
        hasMore = rawItems.length >= limit;
      } else if (payload is Map) {
        final data = Map<String, dynamic>.from(payload);
        final items = data['items'] ?? data['notifications'] ?? data['data'];
        rawItems = items is List ? items : const [];
        final totalPages = int.tryParse(
          '${data['totalPages'] ?? data['total_pages'] ?? ''}',
        );
        hasMore = totalPages != null
            ? page < totalPages
            : data['hasMore'] as bool? ??
                  data['has_more'] as bool? ??
                  rawItems.length >= limit;
      } else {
        rawItems = const [];
      }
      final notifications =
          rawItems
              .whereType<Map>()
              .map(
                (item) =>
                    ShopNotification.fromJson(Map<String, dynamic>.from(item)),
              )
              .toList()
            ..sort(
              (a, b) => (b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0))
                  .compareTo(
                    a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0),
                  ),
            );
      return NotificationPage(
        items: notifications,
        page: page,
        hasMore: hasMore,
      );
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<int> fetchUnreadCount() async {
    try {
      final response = await _dio.get(ApiConstants.notificationUnreadCount);
      final body = response.data;
      final payload = body is Map && body.containsKey('data')
          ? body['data']
          : body;
      if (payload is num) return payload.toInt();
      if (payload is Map) {
        final map = Map<String, dynamic>.from(payload);
        final count = map['count'] ?? map['unreadCount'] ?? map['unread_count'];
        return int.tryParse('$count') ?? 0;
      }
      return 0;
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<void> markAsRead(String id) async {
    try {
      await _dio.patch(ApiConstants.notificationRead(Uri.encodeComponent(id)));
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<void> markAllAsRead() async {
    try {
      await _dio.patch(ApiConstants.notificationsReadAll);
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }
}
