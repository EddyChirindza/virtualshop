import 'package:customer_app/features/notifications/domain/notification.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('maps a product notification and its read state', () {
    final notification = ShopNotification.fromJson({
      'id': 17,
      'title': 'Novo produto',
      'message': 'Conheça o produto novo.',
      'type': 'new_product',
      'created_at': '2026-09-14T09:15:00Z',
      'is_read': false,
      'product_id': 42,
      'product_image_url': '/uploads/products/item.jpg',
    });

    expect(notification.id, '17');
    expect(notification.productId, 42);
    expect(notification.isRead, isFalse);
    expect(notification.createdAt, DateTime.utc(2026, 9, 14, 9, 15));
    expect(notification.imageUrl, '/uploads/products/item.jpg');
    expect(notification.copyWith(isRead: true).isRead, isTrue);
  });
}
