import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/providers.dart';
import '../../data/order_repository.dart';
import '../../domain/models/order.dart';

final orderRepositoryProvider = Provider<OrderRepository>((ref) {
  return OrderRepository(dio: ref.watch(dioProvider));
});

final ordersProvider =
    AsyncNotifierProvider<OrdersController, List<CustomerOrder>>(
      OrdersController.new,
    );

final orderDetailProvider =
    AsyncNotifierProvider.family<OrderDetailController, CustomerOrder, int>(
      OrderDetailController.new,
    );

class OrdersController extends AsyncNotifier<List<CustomerOrder>> {
  @override
  Future<List<CustomerOrder>> build() =>
      ref.read(orderRepositoryProvider).fetchOrders();

  Future<void> refresh() async {
    state = await AsyncValue.guard(
      () => ref.read(orderRepositoryProvider).fetchOrders(),
    );
  }
}

class OrderDetailController extends FamilyAsyncNotifier<CustomerOrder, int> {
  @override
  Future<CustomerOrder> build(int orderId) =>
      ref.read(orderRepositoryProvider).fetchOrder(orderId);

  Future<void> refresh() async {
    state = await AsyncValue.guard(
      () => ref.read(orderRepositoryProvider).fetchOrder(arg),
    );
  }
}
