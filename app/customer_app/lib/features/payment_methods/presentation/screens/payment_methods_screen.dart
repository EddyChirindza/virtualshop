import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_text.dart';
import '../../../../core/errors/api_exception.dart';
import '../../../../core/widgets/error_retry.dart';
import '../../domain/models/payment_method.dart';
import '../providers/payment_methods_provider.dart';
import '../widgets/payment_method_tile.dart';
import 'payment_method_form_screen.dart';

class PaymentMethodsScreen extends ConsumerWidget {
  const PaymentMethodsScreen({super.key});

  Future<void> _openForm(BuildContext context, {PaymentMethod? method}) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => PaymentMethodFormScreen(method: method),
      ),
    );
    if (changed == true && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            appText(
              context,
              'Métodos de pagamento atualizados.',
              'Payment methods updated.',
            ),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final methods = ref.watch(paymentMethodsProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(
          appText(context, 'Métodos de pagamento', 'Payment methods'),
        ),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: methods.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => ErrorRetry(
              message: error is ApiException
                  ? error.message
                  : appText(
                      context,
                      'Não foi possível carregar os métodos de pagamento.',
                      'Could not load payment methods.',
                    ),
              onRetry: () =>
                  ref.read(paymentMethodsProvider.notifier).refresh(),
            ),
            data: (items) => RefreshIndicator(
              onRefresh: () =>
                  ref.read(paymentMethodsProvider.notifier).refresh(),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  if (items.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        vertical: 40,
                        horizontal: 16,
                      ),
                      child: Text(
                        appText(
                          context,
                          'Ainda não tens métodos de pagamento. Adiciona o primeiro.',
                          'You have no payment methods yet. Add your first one.',
                        ),
                        textAlign: TextAlign.center,
                      ),
                    )
                  else
                    for (final method in items) ...[
                      Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        clipBehavior: Clip.antiAlias,
                        child: PaymentMethodTile(
                          method: method,
                          onTap: () => _openForm(context, method: method),
                        ),
                      ),
                    ],
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () => _openForm(context),
                    icon: const Icon(Icons.add),
                    label: Text(
                      appText(
                        context,
                        'Adicionar método de pagamento',
                        'Add payment method',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
