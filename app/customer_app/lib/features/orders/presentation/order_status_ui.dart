import 'package:flutter/material.dart';

import '../../../core/app_text.dart';

String orderStatusLabel(BuildContext context, String status) =>
    switch (status) {
      'pending' => appText(context, 'Pendente', 'Pending'),
      'accepted' => appText(context, 'Aceite', 'Accepted'),
      'rejected' => appText(context, 'Rejeitado', 'Rejected'),
      'preparing' => appText(context, 'Em preparação', 'Preparing'),
      'ready_for_pickup' => appText(
        context,
        'Pronto para levantamento',
        'Ready for pickup',
      ),
      'out_for_delivery' => appText(context, 'Em entrega', 'Out for delivery'),
      'completed' => appText(context, 'Concluído', 'Completed'),
      'cancelled' => appText(context, 'Cancelado', 'Cancelled'),
      _ => status,
    };

String paymentStatusLabel(BuildContext context, String status) =>
    switch (status) {
      'pending' => appText(context, 'Pagamento pendente', 'Payment pending'),
      'paid' => appText(context, 'Pago', 'Paid'),
      'failed' => appText(context, 'Pagamento falhado', 'Payment failed'),
      'refund_required' => appText(
        context,
        'Reembolso necessário',
        'Refund required',
      ),
      'refunded' => appText(context, 'Reembolsado', 'Refunded'),
      _ => status,
    };

String deliveryMethodLabel(
  BuildContext context,
  String method,
) => switch (method) {
  'home_delivery' => appText(context, 'Entrega ao domicílio', 'Home delivery'),
  'store_pickup' => appText(context, 'Levantamento na loja', 'Store pickup'),
  _ => method,
};

Color orderStatusColor(String status) => switch (status) {
  'pending' => const Color(0xFFB54708),
  'accepted' || 'preparing' => const Color(0xFF3157D5),
  'ready_for_pickup' => const Color(0xFF087E8B),
  'out_for_delivery' => const Color(0xFF7A3EAE),
  'completed' => const Color(0xFF12805C),
  _ => const Color(0xFFB42318),
};

Color orderStatusBackground(String status) => switch (status) {
  'pending' => const Color(0xFFFFF3E8),
  'accepted' || 'preparing' => const Color(0xFFEAF0FF),
  'ready_for_pickup' => const Color(0xFFEAF7FB),
  'out_for_delivery' => const Color(0xFFF3E8FF),
  'completed' => const Color(0xFFE8F8F1),
  _ => const Color(0xFFFEF3F2),
};

String formatOrderDate(BuildContext context, DateTime? date) {
  if (date == null) return appText(context, 'Data não disponível', 'No date');
  final local = date.toLocal();
  final day = local.day.toString().padLeft(2, '0');
  final month = local.month.toString().padLeft(2, '0');
  final hour = local.hour.toString().padLeft(2, '0');
  final minute = local.minute.toString().padLeft(2, '0');
  return '$day/$month/${local.year} · $hour:$minute';
}
