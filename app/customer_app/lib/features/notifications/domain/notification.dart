class ShopNotification {
  const ShopNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.createdAt,
    required this.isRead,
    this.productId,
    this.orderId,
    this.promotionId,
    this.imageUrl,
  });

  final String id;
  final String title;
  final String message;
  final String type;
  final DateTime? createdAt;
  final bool isRead;
  final int? productId;
  final int? orderId;
  final int? promotionId;
  final String? imageUrl;

  factory ShopNotification.fromJson(Map<String, dynamic> json) {
    final rawDate =
        json['createdAt'] ?? json['created_at'] ?? json['published_at'];
    final rawProductId = json['productId'] ?? json['product_id'];
    final rawOrderId = json['orderId'] ?? json['order_id'];
    final rawPromotionId = json['promotionId'] ?? json['promotion_id'];
    final product = json['product'];
    final productMap = product is Map
        ? Map<String, dynamic>.from(product)
        : null;
    return ShopNotification(
      id: '${json['id'] ?? json['notificationId'] ?? json['notification_id'] ?? ''}',
      title: json['title'] as String? ?? '',
      message: json['message'] as String? ?? json['body'] as String? ?? '',
      type: json['type'] as String? ?? 'general',
      createdAt: rawDate is String ? DateTime.tryParse(rawDate) : null,
      isRead:
          json['isRead'] as bool? ??
          json['is_read'] as bool? ??
          (json['readAt'] ?? json['read_at']) != null,
      productId: _asInt(rawProductId ?? productMap?['id']),
      orderId: _asInt(rawOrderId),
      promotionId: _asInt(rawPromotionId),
      imageUrl:
          (json['imageUrl'] ??
                  json['image_url'] ??
                  json['product_image_url'] ??
                  productMap?['image_url'])
              as String?,
    );
  }

  ShopNotification copyWith({bool? isRead}) => ShopNotification(
    id: id,
    title: title,
    message: message,
    type: type,
    createdAt: createdAt,
    isRead: isRead ?? this.isRead,
    productId: productId,
    orderId: orderId,
    promotionId: promotionId,
    imageUrl: imageUrl,
  );

  static int? _asInt(Object? value) =>
      value is num ? value.toInt() : int.tryParse('$value');
}

class NotificationPage {
  const NotificationPage({
    required this.items,
    required this.page,
    required this.hasMore,
  });

  final List<ShopNotification> items;
  final int page;
  final bool hasMore;
}
