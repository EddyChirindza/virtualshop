import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/format.dart';
import '../../products/widgets/product_image.dart';
import '../providers/cart_provider.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartControllerProvider);

    ref.listen(cartControllerProvider, (previous, next) {
      if (next.errorMessage != null && next.errorMessage != previous?.errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(next.errorMessage!)));
      }
    });

    if (cart.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Carrinho')),
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.shopping_cart_outlined, size: 72, color: Color(0xFF064B95)),
                  const SizedBox(height: 20),
                  Text(
                    'Seu carrinho está vazio',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  const Text('Adicione produtos para começar a sua compra.', textAlign: TextAlign.center),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: () => Navigator.of(context).maybePop(),
                    icon: const Icon(Icons.storefront_outlined),
                    label: const Text('Explorar produtos'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Carrinho'),
        actions: [
          TextButton(
            onPressed: cart.isUpdating ? null : () => ref.read(cartControllerProvider.notifier).clearCart(),
            child: const Text('Limpar'),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                itemCount: cart.sortedItems.length,
                separatorBuilder: (context, index) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final item = cart.sortedItems[index];
                  final controller = ref.read(cartControllerProvider.notifier);

                  return Card(
                    elevation: 0,
                    color: Colors.white,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: SizedBox(
                              width: 82,
                              height: 82,
                              child: ProductImage(url: item.product.imageUrl, fit: BoxFit.cover),
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
                                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                                ),
                                const SizedBox(height: 4),
                                Text(item.unitPriceLabel, style: Theme.of(context).textTheme.bodyMedium),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    IconButton.filledTonal(
                                      onPressed: cart.isUpdating ? null : () => controller.updateQuantity(item.productId, item.quantity - 1),
                                      icon: const Icon(Icons.remove),
                                      constraints: const BoxConstraints.tightFor(width: 32, height: 32),
                                    ),
                                    Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 12),
                                      child: Text(
                                        '${item.quantity}',
                                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                                      ),
                                    ),
                                    IconButton.filledTonal(
                                      onPressed: cart.isUpdating ? null : () => controller.updateQuantity(item.productId, item.quantity + 1),
                                      icon: const Icon(Icons.add),
                                      constraints: const BoxConstraints.tightFor(width: 32, height: 32),
                                    ),
                                    const Spacer(),
                                    IconButton(
                                      onPressed: cart.isUpdating ? null : () => controller.removeProduct(item.productId),
                                      icon: const Icon(Icons.delete_outline),
                                      color: Colors.red,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: Text(
                                    'Subtotal: ${item.subtotalLabel}',
                                    style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
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
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Colors.grey.shade200)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Resumo da compra', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  _SummaryLine(label: 'Subtotal', value: formatMoney(cart.subtotal)),
                  _SummaryLine(label: 'Desconto', value: formatMoney(cart.discount)),
                  _SummaryLine(label: 'Taxa de entrega', value: formatMoney(cart.deliveryFee)),
                  const Divider(height: 20),
                  _SummaryLine(label: 'Total', value: formatMoney(cart.total), isTotal: true),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: cart.isUpdating
                        ? null
                        : () async {
                            final success = await ref.read(cartControllerProvider.notifier).checkout();
                            if (!context.mounted) return;
                            if (success) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Pedido criado com sucesso.')),
                              );
                            }
                          },
                    child: cart.isUpdating
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Finalizar pedido'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryLine extends StatelessWidget {
  const _SummaryLine({required this.label, required this.value, this.isTotal = false});

  final String label;
  final String value;
  final bool isTotal;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(label, style: isTotal ? Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700) : null),
          const Spacer(),
          Text(value, style: isTotal ? Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700) : null),
        ],
      ),
    );
  }
}
