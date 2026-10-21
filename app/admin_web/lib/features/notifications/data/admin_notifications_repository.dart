import '../../../core/network/admin_api.dart';

class AdminNotification {
  const AdminNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.status,
    this.createdAt,
  });

  final String id;
  final String title;
  final String message;
  final String type;
  final String status;
  final DateTime? createdAt;

  factory AdminNotification.fromJson(Map<String, dynamic> json) =>
      AdminNotification(
        id: '${json['id'] ?? ''}',
        title: json['title'] as String? ?? '',
        message: json['message'] as String? ?? '',
        type: json['type'] as String? ?? 'general',
        status: json['status'] as String? ?? 'draft',
        createdAt: DateTime.tryParse(
          '${json['created_at'] ?? json['createdAt'] ?? ''}',
        ),
      );
}

class AdminNotificationsRepository {
  AdminNotificationsRepository({required String token})
    : _api = AdminApi(token: token);
  final AdminApi _api;

  Future<List<AdminNotification>> list() async {
    final response = await _api.dio.get(
      '/admin/notifications',
      queryParameters: {'page': 1, 'limit': 50},
    );
    final body = response.data;
    final data = body is Map && body['data'] != null ? body['data'] : body;
    final items = data is List
        ? data
        : data is Map
        ? data['items'] ?? data['notifications'] ?? const []
        : const [];
    if (items is! List) return const [];
    return items
        .whereType<Map>()
        .map(
          (item) => AdminNotification.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList();
  }

  Future<void> create({
    required String title,
    required String message,
    required String type,
    required String status,
    int? productId,
    DateTime? expiresAt,
  }) async {
    await _api.dio.post(
      '/admin/notifications',
      data: {
        'title': title,
        'message': message,
        'type': type,
        'status': status,
        'recipient_scope': 'all_customers',
        if (productId != null) 'product_id': productId,
        if (expiresAt != null) 'expires_at': expiresAt.toIso8601String(),
      },
    );
  }

  Future<void> archive(String id) async {
    await _api.dio.patch(
      '/admin/notifications/${Uri.encodeComponent(id)}/archive',
    );
  }
}
