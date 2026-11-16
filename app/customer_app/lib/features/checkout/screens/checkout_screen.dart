import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/app_navigation.dart';
import '../../../core/app_text.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/error_retry.dart';
import '../../../theme/app_theme.dart';
import '../../cart/models/cart_item.dart';
import '../../cart/providers/cart_provider.dart';
import '../../payment_methods/domain/models/payment_method.dart';
import '../../payment_methods/presentation/providers/payment_methods_provider.dart';
import '../../payment_methods/presentation/screens/payment_method_form_screen.dart';
import '../../payment_methods/presentation/widgets/payment_method_tile.dart';
import '../../products/widgets/product_image.dart';
import '../../profile/domain/models/profile_address.dart';
import '../../profile/presentation/providers/profile_providers.dart';
import '../../profile/presentation/screens/address_form_screen.dart';
import '../../profile/presentation/widgets/profile_widgets.dart';

enum DeliveryMethodType { homeDelivery, storePickup }

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  DeliveryMethodType _deliveryMethod = DeliveryMethodType.homeDelivery;
  int? _selectedPaymentMethodId;
  int? _selectedAddressId;
  bool _isProcessing = false;
  String? _checkoutError;

  void _syncDefaults({
    required List<PaymentMethod> methods,
    required List<ProfileAddress> addresses,
  }) {
    if (_selectedPaymentMethodId == null && methods.isNotEmpty) {
      final defaultMethod = methods.cast<PaymentMethod?>().firstWhere(
        (m) => m?.isDefault == true,
        orElse: () => methods.first,
      );
      _selectedPaymentMethodId = defaultMethod?.id;
    } else if (_selectedPaymentMethodId != null &&
        !methods.any((m) => m.id == _selectedPaymentMethodId)) {
      _selectedPaymentMethodId = methods.isNotEmpty ? methods.first.id : null;
    }

    if (_selectedAddressId == null && addresses.isNotEmpty) {
      final defaultAddress = addresses.cast<ProfileAddress?>().firstWhere(
        (a) => a?.isDefault == true,
        orElse: () => addresses.first,
      );
      _selectedAddressId = defaultAddress?.id;
    } else if (_selectedAddressId != null &&
        !addresses.any((a) => a.id == _selectedAddressId)) {
      _selectedAddressId = addresses.isNotEmpty ? addresses.first.id : null;
    }
  }

  Future<void> _processCheckout({
    required PaymentMethod paymentMethod,
    required ProfileAddress? address,
    required double total,
  }) async {
    setState(() {
      _isProcessing = true;
      _checkoutError = null;
    });

    // 1. Simulação visual do processamento do pagamento
    await Future.delayed(const Duration(milliseconds: 1400));
    if (!mounted) return;

    // 2. Validação simulada do método de pagamento
    if (paymentMethod.isMpesa) {
      final phone = paymentMethod.phone?.replaceAll(RegExp(r'\D'), '') ?? '';
      if (phone.length < 8) {
        setState(() {
          _isProcessing = false;
          _checkoutError = appText(
            context,
            'Número M-Pesa inválido para processamento.',
            'Invalid M-Pesa number for processing.',
          );
        });
        return;
      }
    } else {
      final expiryMonth = paymentMethod.expiryMonth;
      final expiryYear = paymentMethod.expiryYear;
      final now = DateTime.now();
      if (expiryYear != null &&
          expiryMonth != null &&
          (expiryYear < now.year ||
              (expiryYear == now.year && expiryMonth < now.month))) {
        setState(() {
          _isProcessing = false;
          _checkoutError = appText(
            context,
            'O cartão Visa selecionado está expirado.',
            'The selected Visa card is expired.',
          );
        });
        return;
      }
    }

    // 3. Criação do pedido através do backend
    final cartController = ref.read(cartControllerProvider.notifier);
    final deliveryAddressId = _deliveryMethod == DeliveryMethodType.homeDelivery
        ? address?.id
        : null;

    final success = await cartController.checkout(
      deliveryAddressId: deliveryAddressId,
      paymentMethodId: paymentMethod.id,
      deliveryMethod: _deliveryMethod == DeliveryMethodType.homeDelivery
          ? 'home_delivery'
          : 'store_pickup',
      notes: _deliveryMethod == DeliveryMethodType.storePickup
          ? 'Levantamento na loja'
          : null,
    );

    if (!mounted) return;

    setState(() {
      _isProcessing = false;
    });

    if (success) {
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          icon: const Icon(
            Icons.check_circle_rounded,
            color: Color(0xFF2E7D32),
            size: 56,
          ),
          title: Text(
            appText(ctx, 'Pedido Confirmado!', 'Order Placed!'),
            textAlign: TextAlign.center,
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                appText(
                  ctx,
                  'O teu pagamento simulado foi aprovado e o pedido foi criado com sucesso.',
                  'Your simulated payment was approved and the order was placed successfully.',
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.imagePlaceholder,
                  borderRadius: BorderRadius.circular(AppRadius.image),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${appText(ctx, 'Pagamento:', 'Payment:')} ${paymentMethod.title} (${paymentMethod.maskedValue})',
                      style: Theme.of(ctx).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${appText(ctx, 'Entrega:', 'Delivery:')} ${_deliveryMethod == DeliveryMethodType.homeDelivery ? (address?.label ?? appText(ctx, 'Ao domicílio', 'Home delivery')) : appText(ctx, 'Levantamento na loja', 'Store pickup')}',
                      style: Theme.of(ctx).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${appText(ctx, 'Total pago:', 'Total paid:')} ${formatMoney(total)}',
                      style: Theme.of(ctx).textTheme.bodySmall
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            FilledButton(
              onPressed: () {
                Navigator.of(ctx).pop(); // fecha modal
                ref.read(homeTabRequestProvider.notifier).state = 0;
                Navigator.of(context).popUntil((route) => route.isFirst);
              },
              child: Text(appText(ctx, 'Voltar ao Início', 'Back to Home')),
            ),
          ],
        ),
      );
    } else {
      final error = ref.read(cartControllerProvider).errorMessage;
      setState(() {
        _checkoutError =
            error ??
            appText(
              context,
              'Não foi possível concluir o pedido. Tenta novamente.',
              'Could not complete the order. Try again.',
            );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartControllerProvider);
    final paymentMethodsAsync = ref.watch(paymentMethodsProvider);
    final addressesAsync = ref.watch(profileAddressesProvider);

    // Se o carrinho ficar vazio durante o ecrã (e não estivermos em processamento)
    if (cart.isEmpty && !_isProcessing) {
      return Scaffold(
        appBar: AppBar(
          title: Text(appText(context, 'Finalizar Compra', 'Checkout')),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.shopping_bag_outlined,
                  size: 64,
                  color: AppColors.imagePlaceholderIcon,
                ),
                const SizedBox(height: 16),
                Text(
                  appText(
                    context,
                    'O teu carrinho está vazio',
                    'Your cart is empty',
                  ),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(appText(context, 'Voltar', 'Go back')),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Carregamento de métodos ou endereços
    if (paymentMethodsAsync.isLoading || addressesAsync.isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: Text(appText(context, 'Finalizar Compra', 'Checkout')),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (paymentMethodsAsync.hasError) {
      return Scaffold(
        appBar: AppBar(
          title: Text(appText(context, 'Finalizar Compra', 'Checkout')),
        ),
        body: ErrorRetry(
          message: appText(
            context,
            'Erro ao carregar métodos de pagamento.',
            'Error loading payment methods.',
          ),
          onRetry: () => ref.read(paymentMethodsProvider.notifier).refresh(),
        ),
      );
    }

    if (addressesAsync.hasError) {
      return Scaffold(
        appBar: AppBar(
          title: Text(appText(context, 'Finalizar Compra', 'Checkout')),
        ),
        body: ErrorRetry(
          message: appText(
            context,
            'Erro ao carregar endereços.',
            'Error loading addresses.',
          ),
          onRetry: () => ref.read(profileAddressesProvider.notifier).refresh(),
        ),
      );
    }

    final paymentMethods = paymentMethodsAsync.value ?? const <PaymentMethod>[];
    final addresses = addressesAsync.value ?? const <ProfileAddress>[];

    _syncDefaults(methods: paymentMethods, addresses: addresses);

    final selectedPaymentMethod = paymentMethods
        .cast<PaymentMethod?>()
        .firstWhere(
          (m) => m?.id == _selectedPaymentMethodId,
          orElse: () => null,
        );

    final selectedAddress = addresses.cast<ProfileAddress?>().firstWhere(
      (a) => a?.id == _selectedAddressId,
      orElse: () => null,
    );

    // Cálculo das taxas e total do checkout
    final subtotal = cart.subtotal;
    final discount = cart.discount;
    final double deliveryFee =
        _deliveryMethod == DeliveryMethodType.homeDelivery ? 50.0 : 0.0;
    final total = (subtotal - discount + deliveryFee).clamp(
      0.0,
      double.infinity,
    );

    // Validação para habilitar o botão de confirmação
    final hasPayment = selectedPaymentMethod != null;
    final hasAddressIfRequired =
        _deliveryMethod == DeliveryMethodType.storePickup ||
        selectedAddress != null;
    final canConfirm = hasPayment && hasAddressIfRequired && !_isProcessing;

    return Scaffold(
      appBar: AppBar(
        title: Text(appText(context, 'Finalizar Compra', 'Checkout')),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
            children: [
              if (_checkoutError != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.errorContainer,
                    borderRadius: BorderRadius.circular(AppRadius.field),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.error_outline_rounded,
                        color: Theme.of(context).colorScheme.onErrorContainer,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _checkoutError!,
                          style: TextStyle(
                            color: Theme.of(context)
                                .colorScheme
                                .onErrorContainer,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // ── 1. MÉTODO DE PAGAMENTO ──
              _buildSectionTitle(
                context,
                title: appText(
                  context,
                  '1. Método de Pagamento',
                  '1. Payment Method',
                ),
                subtitle: appText(
                  context,
                  'Seleciona o método que pretendes utilizar.',
                  'Select the payment method to use.',
                ),
              ),
              const SizedBox(height: 8),
              _buildPaymentSection(
                context: context,
                methods: paymentMethods,
                selectedId: _selectedPaymentMethodId,
                onSelected: (id) =>
                    setState(() => _selectedPaymentMethodId = id),
              ),
              const SizedBox(height: 24),

              // ── 2. MÉTODO DE ENTREGA ──
              _buildSectionTitle(
                context,
                title: appText(
                  context,
                  '2. Método de Entrega',
                  '2. Delivery Method',
                ),
                subtitle: appText(
                  context,
                  'Como pretendes receber a tua encomenda?',
                  'How would you like to receive your order?',
                ),
              ),
              const SizedBox(height: 8),
              _buildDeliveryMethodSelector(context),
              const SizedBox(height: 12),

              if (_deliveryMethod == DeliveryMethodType.homeDelivery) ...[
                _buildAddressSection(
                  context: context,
                  addresses: addresses,
                  selectedId: _selectedAddressId,
                  onSelected: (id) => setState(() => _selectedAddressId = id),
                ),
              ] else ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: Theme.of(context)
                              .colorScheme
                              .surfaceContainerHighest,
                          child: Icon(
                            Icons.storefront_outlined,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                appText(
                                  context,
                                  'Levantamento na Loja Principal',
                                  'Pickup at Main Store',
                                ),
                                style: Theme.of(context).textTheme.titleSmall
                                    ?.copyWith(fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                appText(
                                  context,
                                  'Sem custos de entrega. Disponível após confirmação do pedido.',
                                  'No delivery fee. Available after order confirmation.',
                                ),
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 24),

              // ── 3. RESUMO DO PEDIDO ──
              _buildSectionTitle(
                context,
                title: appText(
                  context,
                  '3. Resumo da Compra',
                  '3. Order Summary',
                ),
                subtitle: appText(
                  context,
                  'Revê os artigos e os detalhes antes de confirmar.',
                  'Review items and details before confirming.',
                ),
              ),
              const SizedBox(height: 8),
              _buildOrderSummary(
                context: context,
                items: cart.sortedItems,
                subtotal: subtotal,
                discount: discount,
                deliveryFee: deliveryFee,
                total: total,
                paymentMethod: selectedPaymentMethod,
                deliveryMethod: _deliveryMethod,
                address: selectedAddress,
              ),
            ],
          ),
        ),
      ),
      bottomSheet: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          boxShadow: AppShadows.soft,
        ),
        child: SafeArea(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: SizedBox(
              width: double.infinity,
              height: 52,
              child: FilledButton(
                onPressed: canConfirm
                    ? () => _processCheckout(
                        paymentMethod: selectedPaymentMethod,
                        address: selectedAddress,
                        total: total,
                      )
                    : null,
                child: _isProcessing
                    ? Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            appText(
                              context,
                              'A processar pagamento simulado...',
                              'Processing simulated payment...',
                            ),
                          ),
                        ],
                      )
                    : Text(
                        '${appText(context, 'Confirmar Pedido', 'Place Order')} (${formatMoney(total)})',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(
    BuildContext context, {
    required String title,
    required String subtitle,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 2),
        Text(
          subtitle,
          style: Theme.of(context).textTheme.bodySmall
              ?.copyWith(color: AppColors.secondaryText),
        ),
      ],
    );
  }

  Widget _buildPaymentSection({
    required BuildContext context,
    required List<PaymentMethod> methods,
    required int? selectedId,
    required ValueChanged<int> onSelected,
  }) {
    if (methods.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              const Icon(
                Icons.credit_card_off_outlined,
                size: 40,
                color: AppColors.secondaryText,
              ),
              const SizedBox(height: 8),
              Text(
                appText(
                  context,
                  'Não tens métodos de pagamento configurados.',
                  'You have no payment methods configured.',
                ),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute<bool>(
                      builder: (_) => const PaymentMethodFormScreen(),
                    ),
                  );
                  ref.read(paymentMethodsProvider.notifier).refresh();
                },
                icon: const Icon(Icons.add),
                label: Text(
                  appText(
                    context,
                    'Adicionar Método de Pagamento',
                    'Add Payment Method',
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      children: [
        for (final method in methods) ...[
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.card),
              side: BorderSide(
                color: selectedId == method.id
                    ? Theme.of(context).colorScheme.primary
                    : Colors.transparent,
                width: 2,
              ),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(AppRadius.card),
              onTap: () => onSelected(method.id),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                child: Row(
                  children: [
                    Radio<int>(
                      value: method.id,
                      groupValue: selectedId,
                      onChanged: (val) {
                        if (val != null) onSelected(val);
                      },
                    ),
                    Expanded(
                      child: PaymentMethodTile(
                        method: method,
                        onTap: () => onSelected(method.id),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: () async {
              await Navigator.of(context).push(
                MaterialPageRoute<bool>(
                  builder: (_) => const PaymentMethodFormScreen(),
                ),
              );
              ref.read(paymentMethodsProvider.notifier).refresh();
            },
            icon: const Icon(Icons.add, size: 18),
            label: Text(
              appText(context, 'Adicionar outro método', 'Add another method'),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDeliveryMethodSelector(BuildContext context) {
    return SegmentedButton<DeliveryMethodType>(
      segments: [
        ButtonSegment(
          value: DeliveryMethodType.homeDelivery,
          icon: const Icon(Icons.delivery_dining_outlined),
          label: Text(
            appText(context, 'Entrega ao domicílio', 'Home delivery'),
          ),
        ),
        ButtonSegment(
          value: DeliveryMethodType.storePickup,
          icon: const Icon(Icons.storefront_outlined),
          label: Text(appText(context, 'Levantamento na loja', 'Store pickup')),
        ),
      ],
      selected: {_deliveryMethod},
      onSelectionChanged: (set) {
        setState(() {
          _deliveryMethod = set.first;
        });
      },
    );
  }

  Widget _buildAddressSection({
    required BuildContext context,
    required List<ProfileAddress> addresses,
    required int? selectedId,
    required ValueChanged<int> onSelected,
  }) {
    if (addresses.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              const Icon(
                Icons.location_off_outlined,
                size: 40,
                color: AppColors.secondaryText,
              ),
              const SizedBox(height: 8),
              Text(
                appText(
                  context,
                  'Não tens endereços de entrega configurados.',
                  'You have no delivery addresses configured.',
                ),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute<bool>(
                      builder: (_) => const AddressFormScreen(),
                    ),
                  );
                  ref.read(profileAddressesProvider.notifier).refresh();
                },
                icon: const Icon(Icons.add),
                label: Text(
                  appText(context, 'Adicionar Endereço', 'Add Address'),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      children: [
        for (final address in addresses) ...[
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.card),
              side: BorderSide(
                color: selectedId == address.id
                    ? Theme.of(context).colorScheme.primary
                    : Colors.transparent,
                width: 2,
              ),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(AppRadius.card),
              onTap: () => onSelected(address.id),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                child: Row(
                  children: [
                    Radio<int>(
                      value: address.id,
                      groupValue: selectedId,
                      onChanged: (val) {
                        if (val != null) onSelected(val);
                      },
                    ),
                    Expanded(
                      child: AddressListTile(
                        address: address,
                        onTap: () => onSelected(address.id),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: () async {
              await Navigator.of(context).push(
                MaterialPageRoute<bool>(
                  builder: (_) => const AddressFormScreen(),
                ),
              );
              ref.read(profileAddressesProvider.notifier).refresh();
            },
            icon: const Icon(Icons.add, size: 18),
            label: Text(
              appText(
                context,
                'Adicionar outro endereço',
                'Add another address',
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildOrderSummary({
    required BuildContext context,
    required List<CartItem> items,
    required double subtotal,
    required double discount,
    required double deliveryFee,
    required double total,
    required PaymentMethod? paymentMethod,
    required DeliveryMethodType deliveryMethod,
    required ProfileAddress? address,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              appText(context, 'Itens do pedido', 'Order items'),
              style: Theme.of(context).textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            for (final item in items) ...[
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: SizedBox(
                        width: 36,
                        height: 36,
                        child: ProductImage(
                          url: item.product.imageUrl,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        '${item.quantity}x ${item.product.name}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium,
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
            ],
            const Divider(height: 20),
            _SummaryLine(
              label: appText(context, 'Subtotal', 'Subtotal'),
              value: formatMoney(subtotal),
            ),
            if (discount > 0)
              _SummaryLine(
                label: appText(context, 'Desconto', 'Discount'),
                value: '-${formatMoney(discount)}',
              ),
            _SummaryLine(
              label: appText(context, 'Taxa de entrega', 'Delivery fee'),
              value: deliveryFee == 0
                  ? appText(context, 'Grátis', 'Free')
                  : formatMoney(deliveryFee),
            ),
            const Divider(height: 20),
            _SummaryLine(
              label: 'Total',
              value: formatMoney(total),
              isTotal: true,
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(AppRadius.image),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.payment, size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          paymentMethod != null
                              ? '${paymentMethod.title} (${paymentMethod.maskedValue})'
                              : appText(
                                  context,
                                  'Nenhum selecionado',
                                  'None selected',
                                ),
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(
                        deliveryMethod == DeliveryMethodType.homeDelivery
                            ? Icons.local_shipping_outlined
                            : Icons.storefront_outlined,
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          deliveryMethod == DeliveryMethodType.homeDelivery
                              ? (address != null
                                    ? '${address.label}: ${address.summary}'
                                    : appText(
                                        context,
                                        'Nenhum endereço selecionado',
                                        'No address selected',
                                      ))
                              : appText(
                                  context,
                                  'Levantamento na loja',
                                  'Store pickup',
                                ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
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
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Text(
            label,
            style: isTotal
                ? Theme.of(context).textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700)
                : Theme.of(context).textTheme.bodyMedium,
          ),
          const Spacer(),
          Text(
            value,
            style: isTotal
                ? Theme.of(context).textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700)
                : Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}
