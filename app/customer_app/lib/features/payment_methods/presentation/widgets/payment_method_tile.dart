import 'package:flutter/material.dart';

import '../../../../core/app_text.dart';
import '../../domain/models/payment_method.dart';

class PaymentMethodTile extends StatelessWidget {
  const PaymentMethodTile({
    required this.method,
    required this.onTap,
    super.key,
  });

  final PaymentMethod method;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final icon = method.isMpesa
        ? Icons.phone_android_outlined
        : Icons.credit_card_outlined;
    final detail = method.isMpesa
        ? '${appText(context, 'Telemóvel', 'Phone')} ${method.maskedValue}'
        : method.maskedValue;

    return ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
        child: Icon(icon, color: Theme.of(context).colorScheme.primary),
      ),
      title: Row(
        children: [
          Flexible(
            child: Text(
              method.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (method.isDefault) ...[const SizedBox(width: 7), _DefaultBadge()],
        ],
      ),
      subtitle: Text(detail, maxLines: 1, overflow: TextOverflow.ellipsis),
      trailing: const Icon(Icons.chevron_right),
    );
  }
}

class _DefaultBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.primaryContainer,
      borderRadius: BorderRadius.circular(12),
    ),
    child: Text(
      appText(context, 'Padrão', 'Default'),
      style: Theme.of(context).textTheme.labelSmall
          ?.copyWith(color: Theme.of(context).colorScheme.onPrimaryContainer),
    ),
  );
}
