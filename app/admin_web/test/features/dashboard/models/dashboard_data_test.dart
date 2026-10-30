import 'package:admin_web/features/dashboard/models/dashboard_data.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('DashboardData.fromJson', () {
    test('lê métricas, séries e listas', () {
      final data = DashboardData.fromJson({
        'metrics': {
          'revenue': '1500.50',
          'orders': '12',
          'pendingOrders': 3,
          'lowStockProducts': '2',
          'customers': 20,
          'products': '35',
        },
        'revenueSeries': [
          {'label': '01/05', 'value': '100.25'},
          {'label': '02/05', 'value': 200},
        ],
        'recentOrders': [
          {
            'id': '8',
            'customer': 'Ana',
            'status': 'pending',
            'total': '450.00',
            'createdAt': '2026-05-02T14:00:00.000Z',
          },
        ],
        'lowStockProducts': [
          {'id': '4', 'name': 'Café', 'stock_status': 'out_of_stock'},
        ],
      });

      expect(data.revenue, 1500.5);
      expect(data.orderCount, 12);
      expect(data.pendingOrders, 3);
      expect(data.lowStockCount, 2);
      expect(data.customerCount, 20);
      expect(data.productCount, 35);
      expect(data.revenueSeries, hasLength(2));
      expect(data.revenueSeries.first.label, '01/05');
      expect(data.revenueSeries.first.value, 100.25);
      expect(data.recentOrders.single.customer, 'Ana');
      expect(data.recentOrders.single.total, 450);
      expect(data.lowStockProducts.single.status, 'out_of_stock');
    });

    test('usa listas vazias e valores zero por omissão', () {
      final data = DashboardData.fromJson({'metrics': <String, dynamic>{}});

      expect(data.revenue, 0);
      expect(data.orderCount, 0);
      expect(data.pendingOrders, 0);
      expect(data.lowStockCount, 0);
      expect(data.customerCount, 0);
      expect(data.productCount, 0);
      expect(data.revenueSeries, isEmpty);
      expect(data.recentOrders, isEmpty);
      expect(data.lowStockProducts, isEmpty);
    });
  });

  group('RevenuePoint.fromJson', () {
    test('lê label e value com defaults seguros', () {
      expect(
        RevenuePoint.fromJson({'label': '01/05', 'value': '10'}).value,
        10,
      );
      expect(RevenuePoint.fromJson({}).label, '');
      expect(RevenuePoint.fromJson({}).value, 0);
    });
  });

  group('AdminOrderSummary.fromJson', () {
    test('lê a encomenda e tolera campos ausentes', () {
      final order = AdminOrderSummary.fromJson({
        'id': '5',
        'customer': 'Carlos',
        'status': 'delivered',
        'total': '99.90',
        'createdAt': '2026-06-01T10:00:00.000Z',
      });

      expect(order.id, 5);
      expect(order.customer, 'Carlos');
      expect(order.status, 'delivered');
      expect(order.total, 99.9);
      expect(order.createdAt, DateTime.parse('2026-06-01T10:00:00.000Z'));

      final empty = AdminOrderSummary.fromJson({});
      expect(empty.id, 0);
      expect(empty.customer, 'Cliente');
      expect(empty.status, 'pending');
      expect(empty.total, 0);
      expect(empty.createdAt, isNull);
    });
  });

  group('LowStockProduct.fromJson', () {
    test('lê o produto e usa defaults seguros', () {
      final product = LowStockProduct.fromJson({
        'id': '3',
        'name': 'Chá',
        'stock_status': 'low_stock',
      });

      expect(product.id, 3);
      expect(product.name, 'Chá');
      expect(product.status, 'low_stock');

      final empty = LowStockProduct.fromJson({});
      expect(empty.id, 0);
      expect(empty.name, 'Produto');
      expect(empty.status, 'low_stock');
    });
  });
}
