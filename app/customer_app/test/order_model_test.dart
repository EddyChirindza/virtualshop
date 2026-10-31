import 'package:customer_app/features/notifications/domain/notification.dart';
import 'package:customer_app/features/orders/domain/models/order.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('maps an order with payment, delivery, address and items', () {
    final order = CustomerOrder.fromJson({
      'id': 9,
      'status': 'accepted',
      'paymentStatus': 'paid',
      'deliveryMethod': 'home_delivery',
      'subtotal': '1000.00',
      'discount': '0.00',
      'deliveryFee': '50.00',
      'total': '1050.00',
      'createdAt': '2026-10-30T10:00:00Z',
      'paymentMethod': {
        'id': 3,
        'type': 'mpesa',
        'label': 'M-Pesa',
        'phone': '+258841234567',
      },
      'address': {
        'id': 7,
        'label': 'Casa',
        'street': 'Av. Central',
        'number': '12',
        'city': 'Maputo',
      },
      'items': [
        {
          'productId': 4,
          'quantity': 2,
          'unitPrice': '500.00',
          'subtotal': '1000.00',
          'product': {'id': 4, 'name': 'Produto', 'image': '/uploads/p.png'},
        },
      ],
    });

    expect(order.id, 9);
    expect(order.status, 'accepted');
    expect(order.paymentStatus, 'paid');
    expect(order.isHomeDelivery, isTrue);
    expect(order.total, 1050);
    expect(order.paymentMethod?.maskedValue, '•••• 4567');
    expect(order.address?.summary, contains('Av. Central'));
    expect(order.items.single.quantity, 2);
    expect(order.items.single.name, 'Produto');
  });

  test('maps an order notification to its order id', () {
    final notification = ShopNotification.fromJson({
      'id': 20,
      'title': 'Pedido aceite!',
      'message': 'O teu pedido #9 foi aceite.',
      'type': 'order_update',
      'order_id': 9,
      'created_at': '2026-10-30T10:00:00Z',
      'is_read': false,
    });

    expect(notification.orderId, 9);
    expect(notification.productId, isNull);
  });
}
