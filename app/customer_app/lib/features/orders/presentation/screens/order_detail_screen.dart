import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_text.dart';
import '../../../../core/errors/api_exception.dart';
import '../../../../core/utils/format.dart';
import '../../../../core/widgets/error_retry.dart';
import '../../../../theme/app_theme.dart';
import '../../../notifications/presentation/providers/notification_providers.dart';
import '../../../products/widgets/product_image.dart';
import '../../domain/models/order.dart';
import '../order_status_ui.dart';
import '../providers/order_providers.dart';

class OrderDetailScreen extends ConsumerStatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});
  final int orderId;

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _pollTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      if (!mounted) return;
      ref.read(orderDetailProvider(widget.orderId).notifier).refresh();
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _refresh() =>
      ref.read(orderDetailProvider(widget.orderId).notifier).refresh();

  @override
  Widget build(BuildContext context) {
    ref.listen<AsyncValue<CustomerOrder>>(orderDetailProvider(widget.orderId), (
      previous,
      next,
    ) {
      final before = previous?.valueOrNull?.status;
      final after = next.valueOrNull?.status;
      if (before != null && after != null && before != after) {
        ref.invalidate(notificationsProvider);
        ref.invalidate(unreadNotificationCountProvider);
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(
                appText(
                  context,
                  'O estado do pedido foi atualizado.',
                  'The order status has been updated.',
                ),
              ),
            ),
          );
      }
    });

    final order = ref.watch(orderDetailProvider(widget.orderId));
    return Scaffold(
      appBar: AppBar(
        title: Text(appText(context, 'Detalhes do pedido', 'Order details')),
        actions: [
          IconButton(
            tooltip: appText(context, 'Atualizar', 'Refresh'),
            onPressed: _refresh,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: order.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorRetry(
          message: error is ApiException
              ? error.message
              : appText(
                  context,
                  'Não foi possível carregar o pedido.',
                  'Could not load the order.',
                ),
          onRetry: _refresh,
        ),
        data: (value) => RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
            children: [
              _StatusCard(order: value),
              if (value.rejectionReason != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3F2),
                    borderRadius: BorderRadius.circular(AppRadius.card),
                  ),
                  child: Text(
                    '${appText(context, 'Motivo:', 'Reason:')} ${value.rejectionReason}',
                    style: const TextStyle(color: Color(0xFFB42318)),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              _Section(
                title: appText(context, 'Produtos', 'Items'),
                child: Column(
                  children: [
                    for (final item in value.items)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 7),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: SizedBox(
                                width: 44,
                                height: 44,
                                child: ProductImage(
                                  url: item.image ?? '',
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.name,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.copyWith(fontWeight: FontWeight.w600),
                                  ),
                                  Text(
                                    '${item.quantity} x ${formatMoney(item.unitPrice)}',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              formatMoney(item.subtotal),
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    if (value.items.isEmpty)
                      Text(
                        appText(
                          context,
                          'Sem produtos registados.',
                          'No items recorded.',
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              _Section(
                title: appText(
                  context,
                  'Pagamento e entrega',
                  'Payment and delivery',
                ),
                child: Column(
                  children: [
                    _InfoRow(
                      label: appText(context, 'Pagamento', 'Payment'),
                      value: value.paymentMethod == null
                          ? appText(context, 'Não indicado', 'Not provided')
                          : '${value.paymentMethod!.displayLabel} · ${value.paymentMethod!.maskedValue}',
                    ),
                    _InfoRow(
                      label: appText(
                        context,
                        'Estado do pagamento',
                        'Payment status',
                      ),
                      value: paymentStatusLabel(context, value.paymentStatus),
                    ),
                    _InfoRow(
                      label: appText(context, 'Entrega', 'Delivery'),
                      value: deliveryMethodLabel(context, value.deliveryMethod),
                    ),
                    if (value.isHomeDelivery)
                      _InfoRow(
                        label: appText(context, 'Endereço', 'Address'),
                        value: value.address == null
                            ? appText(context, 'Não indicado', 'Not provided')
                            : '${value.address!.label ?? appText(context, 'Endereço', 'Address')}: ${value.address!.summary}',
                      ),
                    if (value.notes != null)
                      _InfoRow(
                        label: appText(context, 'Observações', 'Notes'),
                        value: value.notes!,
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              _Section(
                title: appText(context, 'Resumo', 'Summary'),
                child: Column(
                  children: [
                    _InfoRow(
                      label: appText(context, 'Subtotal', 'Subtotal'),
                      value: formatMoney(value.subtotal),
                    ),
                    _InfoRow(
                      label: appText(context, 'Desconto', 'Discount'),
                      value: '- ${formatMoney(value.discount)}',
                    ),
                    _InfoRow(
                      label: appText(
                        context,
                        'Taxa de entrega',
                        'Delivery fee',
                      ),
                      value: value.deliveryFee == 0
                          ? appText(context, 'Grátis', 'Free')
                          : formatMoney(value.deliveryFee),
                    ),
                    const Divider(height: 20),
                    _InfoRow(
                      label: 'Total',
                      value: formatMoney(value.total),
                      strong: true,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Center(
                child: Text(
                  '${appText(context, 'Pedido', 'Order')} #${value.id} · ${formatOrderDate(context, value.createdAt)}',
                  style: Theme.of(context).textTheme.bodySmall
                      ?.copyWith(color: AppColors.secondaryText),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({required this.order});
  final CustomerOrder order;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: orderStatusBackground(order.status),
      borderRadius: BorderRadius.circular(AppRadius.card),
    ),
    child: Row(
      children: [
        Icon(
          _statusIcon(order.status),
          size: 30,
          color: orderStatusColor(order.status),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${appText(context, 'Pedido', 'Order')} #${order.id}',
                style: Theme.of(context).textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 3),
              Text(
                orderStatusLabel(context, order.status),
                style: TextStyle(
                  color: orderStatusColor(order.status),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              formatMoney(order.total),
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            Text(
              paymentStatusLabel(context, order.paymentStatus),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ],
    ),
  );

  IconData _statusIcon(String status) => switch (status) {
    'pending' => Icons.schedule,
    'accepted' || 'preparing' => Icons.autorenew,
    'ready_for_pickup' => Icons.storefront_outlined,
    'out_for_delivery' => Icons.delivery_dining_outlined,
    'completed' => Icons.check_circle_outline,
    'rejected' => Icons.cancel_outlined,
    _ => Icons.info_outline,
  };
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Card(
    margin: EdgeInsets.zero,
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleSmall
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    ),
  );
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.label,
    required this.value,
    this.strong = false,
  });
  final String label;
  final String value;
  final bool strong;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 3),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodySmall
                ?.copyWith(color: AppColors.secondaryText),
          ),
        ),
        const SizedBox(width: 12),
        Flexible(
          flex: 2,
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: strong ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
        ),
      ],
    ),
  );
}
