import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/app_navigation.dart';
import '../../../core/app_text.dart';
import '../../../theme/app_theme.dart';
import '../../../core/utils/format.dart';
import '../../products/widgets/product_image.dart';
import '../providers/cart_provider.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartControllerProvider);

    ref.listen(cartControllerProvider, (previous, next) {
      if (next.errorMessage != null &&
          next.errorMessage != previous?.errorMessage) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(next.errorMessage!)));
      }
    });

    if (cart.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.shopping_cart_outlined,
                size: 72,
                color: AppColors.imagePlaceholderIcon,
              ),
              const SizedBox(height: 20),
              Text(
                appText(
                  context,
                  'O teu carrinho está vazio',
                  'Your cart is empty',
                ),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 12),
              Text(
                appText(
                  context,
                  'Adiciona produtos para começar a comprar.',
                  'Add products to start shopping.',
                ),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium
                    ?.copyWith(color: AppColors.secondaryText),
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: () {
                  ref.read(homeTabRequestProvider.notifier).state = 0;
                  Navigator.of(context).popUntil((route) => route.isFirst);
                },
                icon: const Icon(Icons.storefront_outlined),
                label: Text(
                  appText(context, 'Explorar produtos', 'Browse products'),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: cart.isUpdating
                  ? null
                  : () => ref.read(cartControllerProvider.notifier).clearCart(),
              child: Text(appText(context, 'Limpar', 'Clear')),
            ),
          ),
        ),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
            itemCount: cart.sortedItems.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final item = cart.sortedItems[index];
              final controller = ref.read(cartControllerProvider.notifier);

              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(AppRadius.image),
                        child: SizedBox(
                          width: 82,
                          height: 82,
                          child: ProductImage(
                            url: item.product.imageUrl,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.product.name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.titleSmall,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              item.unitPriceLabel,
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(
                                    color: AppColors.brand,
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                _QuantityButton(
                                  icon: Icons.remove,
                                  tooltip: appText(
                                    context,
                                    'Diminuir quantidade',
                                    'Decrease quantity',
                                  ),
                                  onPressed: cart.isUpdating
                                      ? null
                                      : () => controller.updateQuantity(
                                          item.productId,
                                          item.quantity - 1,
                                        ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                  ),
                                  child: Text(
                                    '${item.quantity}',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleSmall,
                                  ),
                                ),
                                _QuantityButton(
                                  icon: Icons.add,
                                  tooltip: appText(
                                    context,
                                    'Aumentar quantidade',
                                    'Increase quantity',
                                  ),
                                  onPressed: cart.isUpdating
                                      ? null
                                      : () => controller.updateQuantity(
                                          item.productId,
                                          item.quantity + 1,
                                        ),
                                ),
                                const Spacer(),
                                IconButton(
                                  tooltip: appText(
                                    context,
                                    'Remover produto',
                                    'Remove product',
                                  ),
                                  onPressed: cart.isUpdating
                                      ? null
                                      : () => controller.removeProduct(
                                          item.productId,
                                        ),
                                  icon: const Icon(
                                    Icons.delete_outline_rounded,
                                  ),
                                  color: const Color(0xFFB3261E),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Align(
                              alignment: Alignment.centerRight,
                              child: Text(
                                '${appText(context, 'Subtotal', 'Subtotal')}: ${item.subtotalLabel}',
                                style: Theme.of(context).textTheme.labelLarge
                                    ?.copyWith(fontWeight: FontWeight.w700),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    appText(context, 'Resumo da compra', 'Order summary'),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  _SummaryLine(
                    label: 'Subtotal',
                    value: formatMoney(cart.subtotal),
                  ),
                  _SummaryLine(
                    label: appText(context, 'Desconto', 'Discount'),
                    value: formatMoney(cart.discount),
                  ),
                  _SummaryLine(
                    label: appText(context, 'Taxa de entrega', 'Delivery fee'),
                    value: formatMoney(cart.deliveryFee),
                  ),
                  const Divider(height: 20),
                  _SummaryLine(
                    label: 'Total',
                    value: formatMoney(cart.total),
                    isTotal: true,
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 52,
                    child: FilledButton(
                      onPressed: cart.isUpdating
                          ? null
                          : () async {
                              final success = await ref
                                  .read(cartControllerProvider.notifier)
                                  .checkout();
                              if (!context.mounted) return;
                              if (success) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      appText(
                                        context,
                                        'Pedido criado com sucesso.',
                                        'Order placed successfully.',
                                      ),
                                    ),
                                  ),
                                );
                              }
                            },
                      child: cart.isUpdating
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(
                              appText(context, 'Finalizar compra', 'Checkout'),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _QuantityButton extends StatelessWidget {
  const _QuantityButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 34,
    height: 34,
    child: IconButton.filledTonal(
      tooltip: tooltip,
      onPressed: onPressed,
      padding: EdgeInsets.zero,
      style: IconButton.styleFrom(
        backgroundColor: AppColors.imagePlaceholder,
        foregroundColor: AppColors.ink,
        shape: const CircleBorder(),
      ),
      icon: Icon(icon, size: 18),
    ),
  );
}

class _SummaryLine extends StatelessWidget {
  const _SummaryLine({
    required this.label,
    required this.value,
    this.isTotal = false,
  });

  final String label;
  final String value;
  final bool isTotal;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(
            label,
            style: isTotal
                ? Theme.of(context).textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700)
                : null,
          ),
          const Spacer(),
          Text(
            value,
            style: isTotal
                ? Theme.of(context).textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700)
                : null,
          ),
        ],
      ),
    );
  }
}
