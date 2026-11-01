import 'package:admin_web/features/orders/data/orders_repository.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../helpers/fake_dio.dart';

Map<String, dynamic> _orderJson({String status = 'pending'}) => {
  'id': 5,
  'status': status,
  'paymentStatus': 'paid',
  'deliveryMethod': 'store_pickup',
  'total': '1500.00',
  'customer': {'id': 1, 'name': 'Ana'},
  'items': const [],
};

void main() {
  test('lista pedidos com filtros e lê a página', () async {
    final fake = FakeAdminApi((request) {
      expect(request.method, 'GET');
      expect(request.path, '/admin/orders');
      expect(request.queryParameters['status'], 'pending');
      expect(request.queryParameters['search'], 'Ana');
      return jsonResponse({
        'data': {
          'items': [_orderJson()],
          'page': 1,
          'total': 1,
          'totalPages': 1,
        },
      });
    });

    final page = await OrdersRepository(api: fake.api)
        .list(status: 'pending', search: 'Ana');

    expect(page.total, 1);
    expect(page.items.single.id, 5);
  });

  test('aceita, rejeita e atualiza o estado do pedido', () async {
    final calls = <String>[];
    final fake = FakeAdminApi((request) {
      calls.add('${request.method} ${request.path}');
      if (request.path.endsWith('/accept')) {
        return jsonResponse({'data': _orderJson(status: 'accepted')});
      }
      if (request.path.endsWith('/reject')) {
        expect(request.data, {'reason': 'Sem stock'});
        return jsonResponse({'data': _orderJson(status: 'rejected')});
      }
      return jsonResponse({'data': _orderJson(status: 'preparing')});
    });
    final repository = OrdersRepository(api: fake.api);

    expect((await repository.accept(5)).status, 'accepted');
    expect((await repository.reject(5, 'Sem stock')).status, 'rejected');
    expect((await repository.updateStatus(5, 'preparing')).status, 'preparing');

    expect(calls, [
      'POST /admin/orders/5/accept',
      'POST /admin/orders/5/reject',
      'PATCH /admin/orders/5/status',
    ]);
  });

  test('expõe a mensagem de erro devolvida pela API', () async {
    final fake = FakeAdminApi(
      (_) => jsonResponse({
        'success': false,
        'message': 'Transição inválida.',
      }, statusCode: 409),
    );

    expect(
      () => OrdersRepository(api: fake.api).accept(5),
      throwsA(
        predicate((error) => error.toString().contains('Transição inválida.')),
      ),
    );
  });
}
