import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/providers.dart';
import '../../../../core/session/session_controller.dart';
import '../../data/payment_method_repository.dart';
import '../../domain/models/payment_method.dart';

final paymentMethodRepositoryProvider = Provider<PaymentMethodRepository>((
  ref,
) {
  return PaymentMethodRepository(dio: ref.watch(dioProvider));
});

final paymentMethodsProvider =
    AsyncNotifierProvider<PaymentMethodsController, List<PaymentMethod>>(
      PaymentMethodsController.new,
    );

class PaymentMethodsController extends AsyncNotifier<List<PaymentMethod>> {
  @override
  Future<List<PaymentMethod>> build() {
    final session = ref.watch(sessionControllerProvider);
    if (!session.isActive) return Future.value(const <PaymentMethod>[]);
    return ref.read(paymentMethodRepositoryProvider).fetchPaymentMethods();
  }

  Future<void> refresh() async {
    final session = ref.read(sessionControllerProvider);
    if (!session.isActive) {
      state = const AsyncData(<PaymentMethod>[]);
      return;
    }
    final generation = session.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    state = const AsyncLoading<List<PaymentMethod>>().copyWithPrevious(state);
    final result = await AsyncValue.guard(
      () => ref.read(paymentMethodRepositoryProvider).fetchPaymentMethods(),
    );
    if (!sessionController.isCurrent(generation)) return;
    state = result;
  }

  Future<PaymentMethod> add(Map<String, dynamic> fields) async {
    final method = await ref
        .read(paymentMethodRepositoryProvider)
        .createPaymentMethod(fields);
    await refresh();
    return method;
  }

  Future<PaymentMethod> updateMethod(
    int id,
    Map<String, dynamic> fields,
  ) async {
    final method = await ref
        .read(paymentMethodRepositoryProvider)
        .updatePaymentMethod(id, fields);
    await refresh();
    return method;
  }

  Future<void> setDefault(int id) async {
    await ref.read(paymentMethodRepositoryProvider).setDefaultPaymentMethod(id);
    await refresh();
  }

  Future<void> remove(int id) async {
    await ref.read(paymentMethodRepositoryProvider).deletePaymentMethod(id);
    await refresh();
  }
}
