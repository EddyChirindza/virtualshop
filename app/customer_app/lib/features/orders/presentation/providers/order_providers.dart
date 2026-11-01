import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/providers.dart';
import '../../../../core/session/session_controller.dart';
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

CustomerOrder _emptyOrder(int id) => CustomerOrder(
  id: id,
  status: '',
  paymentStatus: '',
  deliveryMethod: '',
  subtotal: 0,
  discount: 0,
  deliveryFee: 0,
  total: 0,
);

class OrdersController extends AsyncNotifier<List<CustomerOrder>> {
  @override
  Future<List<CustomerOrder>> build() {
    final session = ref.watch(sessionControllerProvider);
    if (!session.isActive) return Future.value(const <CustomerOrder>[]);
    return ref.read(orderRepositoryProvider).fetchOrders();
  }

  Future<void> refresh() async {
    final session = ref.read(sessionControllerProvider);
    if (!session.isActive) {
      state = const AsyncData(<CustomerOrder>[]);
      return;
    }
    final generation = session.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    final result = await AsyncValue.guard(
      () => ref.read(orderRepositoryProvider).fetchOrders(),
    );
    if (!sessionController.isCurrent(generation)) return;
    state = result;
  }
}

class OrderDetailController extends FamilyAsyncNotifier<CustomerOrder, int> {
  @override
  Future<CustomerOrder> build(int orderId) {
    final session = ref.watch(sessionControllerProvider);
    if (!session.isActive) return Future.value(_emptyOrder(orderId));
    return ref.read(orderRepositoryProvider).fetchOrder(orderId);
  }

  Future<void> refresh() async {
    final session = ref.read(sessionControllerProvider);
    if (!session.isActive) {
      state = AsyncData(_emptyOrder(arg));
      return;
    }
    final generation = session.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    final result = await AsyncValue.guard(
      () => ref.read(orderRepositoryProvider).fetchOrder(arg),
    );
    if (!sessionController.isCurrent(generation)) return;
    state = result;
  }
}
