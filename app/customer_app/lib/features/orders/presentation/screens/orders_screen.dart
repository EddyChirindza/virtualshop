import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_text.dart';
import '../../../../core/errors/api_exception.dart';
import '../../../../core/utils/format.dart';
import '../../../../core/widgets/error_retry.dart';
import '../../../../theme/app_theme.dart';
import '../../domain/models/order.dart';
import '../order_status_ui.dart';
import '../providers/order_providers.dart';
import 'order_detail_screen.dart';

class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(ordersProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(appText(context, 'Meus pedidos', 'My orders')),
        actions: [
          IconButton(
            tooltip: appText(context, 'Atualizar', 'Refresh'),
            onPressed: () => ref.read(ordersProvider.notifier).refresh(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: orders.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorRetry(
          message: error is ApiException
              ? error.message
              : appText(
                  context,
                  'Não foi possível carregar os pedidos.',
                  'Could not load orders.',
                ),
          onRetry: () => ref.read(ordersProvider.notifier).refresh(),
        ),
        data: (items) => items.isEmpty
            ? _EmptyOrders(
                onRefresh: () => ref.read(ordersProvider.notifier).refresh(),
              )
            : RefreshIndicator(
                onRefresh: () => ref.read(ordersProvider.notifier).refresh(),
                child: ListView.separated(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) => _OrderCard(
                    order: items[index],
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) =>
                            OrderDetailScreen(orderId: items[index].id),
                      ),
                    ),
                  ),
                ),
              ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order, required this.onTap});
  final CustomerOrder order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
    margin: EdgeInsets.zero,
    child: InkWell(
      borderRadius: BorderRadius.circular(AppRadius.card),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  '${appText(context, 'Pedido', 'Order')} #${order.id}',
                  style: Theme.of(context).textTheme.titleSmall
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: orderStatusBackground(order.status),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    orderStatusLabel(context, order.status),
                    style: TextStyle(
                      color: orderStatusColor(order.status),
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              order.items.isEmpty
                  ? appText(context, 'Sem itens', 'No items')
                  : order.items
                        .map((item) => '${item.quantity}x ${item.name}')
                        .join(' · '),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 9),
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${deliveryMethodLabel(context, order.deliveryMethod)} · ${formatOrderDate(context, order.createdAt)}',
                    style: Theme.of(context).textTheme.bodySmall
                        ?.copyWith(color: AppColors.secondaryText),
                  ),
                ),
                Text(
                  formatMoney(order.total),
                  style: Theme.of(context).textTheme.titleSmall
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );
}

class _EmptyOrders extends StatelessWidget {
  const _EmptyOrders({required this.onRefresh});
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.receipt_long_outlined,
            size: 48,
            color: AppColors.secondaryText,
          ),
          const SizedBox(height: 12),
          Text(
            appText(
              context,
              'Ainda não tens pedidos.',
              'You have no orders yet.',
            ),
          ),
          const SizedBox(height: 10),
          TextButton(
            onPressed: onRefresh,
            child: Text(appText(context, 'Atualizar', 'Refresh')),
          ),
        ],
      ),
    ),
  );
}
