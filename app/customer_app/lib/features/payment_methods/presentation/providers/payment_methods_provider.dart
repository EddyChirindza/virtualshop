import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/providers.dart';
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
  Future<List<PaymentMethod>> build() =>
      ref.read(paymentMethodRepositoryProvider).fetchPaymentMethods();

  Future<void> refresh() async {
    state = const AsyncLoading<List<PaymentMethod>>().copyWithPrevious(state);
    state = await AsyncValue.guard(
      () => ref.read(paymentMethodRepositoryProvider).fetchPaymentMethods(),
    );
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
