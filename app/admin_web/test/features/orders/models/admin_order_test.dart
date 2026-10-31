import 'package:admin_web/features/orders/models/admin_order.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('lê o detalhe completo do pedido', () {
    final order = AdminOrder.fromJson({
      'id': 9,
      'status': 'accepted',
      'paymentStatus': 'paid',
      'deliveryMethod': 'home_delivery',
      'subtotal': '1000.00',
      'discount': '0.00',
      'deliveryFee': '50.00',
      'total': '1050.00',
      'createdAt': '2026-10-30T10:00:00.000Z',
      'rejectionReason': null,
      'customer': {
        'id': 2,
        'name': 'Ana',
        'email': 'ana@example.com',
        'phone': '+258840000000',
      },
      'paymentMethod': {
        'id': 4,
        'type': 'mpesa',
        'label': 'M-Pesa',
        'phone': '+258841234567',
      },
      'address': {
        'id': 8,
        'label': 'Casa',
        'street': 'Av. Central',
        'number': '10',
        'city': 'Maputo',
      },
      'items': [
        {
          'productId': 3,
          'quantity': 2,
          'unitPrice': '500.00',
          'subtotal': '1000.00',
          'product': {'id': 3, 'name': 'Produto'},
        },
      ],
    });

    expect(order.id, 9);
    expect(order.status, 'accepted');
    expect(order.paymentStatus, 'paid');
    expect(order.customer?.name, 'Ana');
    expect(order.paymentMethod?.maskedValue, '•••• 4567');
    expect(order.address?.summary, contains('Av. Central'));
    expect(order.items.single.quantity, 2);
    expect(order.isHomeDelivery, isTrue);
  });

  test('lê uma página de pedidos', () {
    final page = AdminOrderPage.fromJson({
      'items': [
        {'id': 1, 'status': 'pending'},
        {'id': 2, 'status': 'completed'},
      ],
      'page': 1,
      'total': 2,
      'totalPages': 1,
    });

    expect(page.items.map((order) => order.id), [1, 2]);
    expect(page.total, 2);
  });
}
