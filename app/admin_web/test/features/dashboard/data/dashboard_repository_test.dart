import 'package:admin_web/features/dashboard/data/dashboard_repository.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../helpers/fake_dio.dart';

void main() {
  group('DashboardRepository.load', () {
    test('envia o período e lê os dados do dashboard', () async {
      final fake = FakeAdminApi((request) {
        expect(request.method, 'GET');
        expect(request.path, '/admin/dashboard');
        expect(request.queryParameters['period'], '7d');
        return jsonResponse({
          'success': true,
          'data': {
            'period': '7d',
            'metrics': {
              'revenue': 2500,
              'orders': 10,
              'pendingOrders': 2,
              'lowStockProducts': 1,
              'customers': 30,
              'products': 40,
            },
            'revenueSeries': [
              {'label': '01/06', 'value': 2500},
            ],
            'recentOrders': [],
            'lowStockProducts': [],
          },
        });
      });

      final data = await DashboardRepository(api: fake.api).load(period: '7d');

      expect(data.revenue, 2500);
      expect(data.orderCount, 10);
      expect(data.pendingOrders, 2);
      expect(data.revenueSeries.single.label, '01/06');
    });

    test('usa 30d por omissão', () async {
      final fake = FakeAdminApi((request) {
        expect(request.queryParameters['period'], '30d');
        return jsonResponse({
          'data': {'metrics': <String, dynamic>{}},
        });
      });

      final data = await DashboardRepository(api: fake.api).load();

      expect(data.revenue, 0);
      expect(data.revenueSeries, isEmpty);
    });
  });
}
