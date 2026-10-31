import 'package:flutter/material.dart';

import '../../data/orders_repository.dart';
import '../../models/admin_order.dart';

const _ink = Color(0xFF182230);
const _muted = Color(0xFF667085);
const _line = Color(0xFFEAECF0);
const _blue = Color(0xFF3157D5);

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key, required this.repository});
  final OrdersRepository repository;

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  late Future<AdminOrderPage> _future;
  final _searchController = TextEditingController();
  String? _status;
  DateTime? _from;
  DateTime? _to;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<AdminOrderPage> _load() => widget.repository.list(
    status: _status,
    search: _searchController.text,
    from: _from == null ? null : _dateParam(_from!),
    to: _to == null ? null : _dateParam(_to!),
  );

  void _reload() => setState(() => _future = _load());

  String _dateParam(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  Future<void> _pickDate({required bool start}) async {
    final now = DateTime.now();
    final selected = await showDatePicker(
      context: context,
      initialDate: (start ? _from : _to) ?? now,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 1),
    );
    if (selected == null) return;
    setState(() {
      if (start) {
        _from = selected;
      } else {
        _to = selected;
      }
      _future = _load();
    });
  }

  Future<void> _open(AdminOrder order) async {
    final changed = await showDialog<bool>(
      context: context,
      builder: (_) =>
          _OrderDetailDialog(repository: widget.repository, orderId: order.id),
    );
    if (changed == true) _reload();
  }

  Future<void> _accept(AdminOrder order) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Aceitar pedido #${order.id}?'),
        content: const Text(
          'O pedido vai ficar disponível para preparação e o cliente será notificado.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Aceitar'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await _runAction(
      () => widget.repository.accept(order.id),
      'Pedido #${order.id} aceite.',
    );
  }

  Future<void> _reject(AdminOrder order) async {
    final reason = await _askRejectReason(context, order.id);
    if (reason == null) return;
    await _runAction(
      () => widget.repository.reject(order.id, reason),
      'Pedido #${order.id} rejeitado.',
    );
  }

  Future<void> _runAction(
    Future<AdminOrder> Function() action,
    String successMessage,
  ) async {
    try {
      await action();
      _reload();
      _notice(successMessage);
    } catch (error) {
      _notice('$error'.replaceFirst('Exception: ', ''), error: true);
    }
  }

  void _notice(String message, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: error ? const Color(0xFFB42318) : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(
        children: [
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Pedidos',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: _ink,
                  ),
                ),
                SizedBox(height: 5),
                Text(
                  'Consulta, aceita e acompanha os pedidos dos clientes.',
                  style: TextStyle(color: _muted, fontSize: 14),
                ),
              ],
            ),
          ),
          OutlinedButton.icon(
            onPressed: _reload,
            icon: const Icon(Icons.refresh),
            label: const Text('Atualizar'),
          ),
        ],
      ),
      const SizedBox(height: 18),
      Wrap(
        spacing: 10,
        runSpacing: 10,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          SizedBox(
            width: 210,
            child: DropdownButtonFormField<String?>(
              initialValue: _status,
              decoration: const InputDecoration(
                labelText: 'Estado',
                isDense: true,
                border: OutlineInputBorder(),
              ),
              items: [
                const DropdownMenuItem<String?>(
                  value: null,
                  child: Text('Todos'),
                ),
                ...orderStatuses.entries.map(
                  (entry) => DropdownMenuItem<String?>(
                    value: entry.key,
                    child: Text(entry.value),
                  ),
                ),
              ],
              onChanged: (value) {
                setState(() {
                  _status = value;
                  _future = _load();
                });
              },
            ),
          ),
          SizedBox(
            width: 290,
            child: TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                labelText: 'Pesquisar cliente ou nº do pedido',
                prefixIcon: Icon(Icons.search),
                isDense: true,
                border: OutlineInputBorder(),
              ),
              onSubmitted: (_) => _reload(),
            ),
          ),
          OutlinedButton.icon(
            onPressed: () => _pickDate(start: true),
            icon: const Icon(Icons.event_outlined, size: 18),
            label: Text(_from == null ? 'Data inicial' : _shortDate(_from!)),
          ),
          OutlinedButton.icon(
            onPressed: () => _pickDate(start: false),
            icon: const Icon(Icons.event_outlined, size: 18),
            label: Text(_to == null ? 'Data final' : _shortDate(_to!)),
          ),
          if (_status != null ||
              _from != null ||
              _to != null ||
              _searchController.text.trim().isNotEmpty)
            TextButton.icon(
              onPressed: () {
                _searchController.clear();
                setState(() {
                  _status = null;
                  _from = null;
                  _to = null;
                  _future = _load();
                });
              },
              icon: const Icon(Icons.clear),
              label: const Text('Limpar filtros'),
            ),
        ],
      ),
      const SizedBox(height: 18),
      Expanded(
        child: FutureBuilder<AdminOrderPage>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting &&
                !snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return _OrdersError(
                message: '${snapshot.error}'.replaceFirst('Exception: ', ''),
                onRetry: _reload,
              );
            }
            final page = snapshot.data;
            final items = page?.items ?? const <AdminOrder>[];
            if (items.isEmpty) {
              return const _EmptyOrders();
            }
            return RefreshIndicator(
              onRefresh: () async => _reload(),
              child: ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: items.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, index) => _OrderCard(
                  order: items[index],
                  onTap: () => _open(items[index]),
                  onAccept: () => _accept(items[index]),
                  onReject: () => _reject(items[index]),
                ),
              ),
            );
          },
        ),
      ),
    ],
  );
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({
    required this.order,
    required this.onTap,
    required this.onAccept,
    required this.onReject,
  });
  final AdminOrder order;
  final VoidCallback onTap;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) => Material(
    color: Colors.white,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(13),
      side: const BorderSide(color: _line),
    ),
    child: InkWell(
      borderRadius: BorderRadius.circular(13),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  '#${order.id}',
                  style: const TextStyle(
                    color: _ink,
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(width: 12),
                StatusPill(status: order.status),
                const SizedBox(width: 8),
                PaymentPill(status: order.paymentStatus),
                const Spacer(),
                Text(
                  _money(order.total),
                  style: const TextStyle(
                    color: _ink,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 22,
              runSpacing: 8,
              children: [
                _Meta(
                  icon: Icons.person_outline,
                  text: order.customer?.name ?? 'Cliente',
                ),
                if (order.customer?.phone != null)
                  _Meta(
                    icon: Icons.phone_outlined,
                    text: order.customer!.phone!,
                  ),
                _Meta(
                  icon: order.isHomeDelivery
                      ? Icons.delivery_dining_outlined
                      : Icons.storefront_outlined,
                  text: deliveryLabel(order.deliveryMethod),
                ),
                _Meta(
                  icon: Icons.credit_card_outlined,
                  text: order.paymentMethod == null
                      ? 'Pagamento não indicado'
                      : '${order.paymentMethod!.displayLabel} ${order.paymentMethod!.maskedValue}',
                ),
                _Meta(icon: Icons.schedule, text: _dateTime(order.createdAt)),
              ],
            ),
            if (order.items.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                order.items
                    .map((item) => '${item.quantity}x ${item.name}')
                    .join(' · '),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: _muted, fontSize: 13),
              ),
            ],
            if (order.status == 'pending') ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: [
                  FilledButton.icon(
                    onPressed: onAccept,
                    icon: const Icon(Icons.check, size: 18),
                    label: const Text('Aceitar'),
                  ),
                  FilledButton.tonalIcon(
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFFEF3F2),
                      foregroundColor: const Color(0xFFB42318),
                    ),
                    onPressed: onReject,
                    icon: const Icon(Icons.close, size: 18),
                    label: const Text('Rejeitar'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    ),
  );
}

class _Meta extends StatelessWidget {
  const _Meta({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 16, color: _muted),
      const SizedBox(width: 5),
      Text(text, style: const TextStyle(color: _muted, fontSize: 12.5)),
    ],
  );
}

class _OrderDetailDialog extends StatefulWidget {
  const _OrderDetailDialog({required this.repository, required this.orderId});
  final OrdersRepository repository;
  final int orderId;

  @override
  State<_OrderDetailDialog> createState() => _OrderDetailDialogState();
}

class _OrderDetailDialogState extends State<_OrderDetailDialog> {
  late Future<AdminOrder> _future;
  var _busy = false;
  var _changed = false;

  @override
  void initState() {
    super.initState();
    _future = widget.repository.get(widget.orderId);
  }

  void _reload() =>
      setState(() => _future = widget.repository.get(widget.orderId));

  Future<void> _run(
    Future<AdminOrder> Function() action,
    String successMessage,
  ) async {
    setState(() => _busy = true);
    try {
      final updated = await action();
      _changed = true;
      if (!mounted) return;
      setState(() {
        _future = Future.value(updated);
      });
      _notice(successMessage);
    } catch (error) {
      _notice('$error'.replaceFirst('Exception: ', ''), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _accept(AdminOrder order) async {
    final confirmed = await _confirm(
      title: 'Aceitar pedido #${order.id}?',
      message: 'O pedido vai ficar disponível para preparação e o cliente será notificado.',
      confirmLabel: 'Aceitar',
    );
    if (confirmed != true) return;
    await _run(
      () => widget.repository.accept(order.id),
      'Pedido #${order.id} aceite.',
    );
  }

  Future<void> _reject(AdminOrder order) async {
    final reason = await _rejectReason(order.id);
    if (reason == null) return;
    await _run(
      () => widget.repository.reject(order.id, reason),
      'Pedido #${order.id} rejeitado.',
    );
  }

  Future<void> _changeStatus(AdminOrder order, String status) async {
    final confirmed = await _confirm(
      title: 'Atualizar pedido #${order.id}?',
      message:
          'O estado vai mudar para "${orderStatusLabel(status)}" e o cliente será notificado.',
      confirmLabel: 'Atualizar',
    );
    if (confirmed != true) return;
    await _run(
      () => widget.repository.updateStatus(order.id, status),
      'Estado atualizado para ${orderStatusLabel(status)}.',
    );
  }

  Future<bool?> _confirm({
    required String title,
    required String message,
    required String confirmLabel,
  }) => showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, true),
          child: Text(confirmLabel),
        ),
      ],
    ),
  );

  Future<String?> _rejectReason(int orderId) =>
      _askRejectReason(context, orderId);

  void _notice(String message, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: error ? const Color(0xFFB42318) : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Dialog(
    insetPadding: const EdgeInsets.all(24),
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 820, maxHeight: 760),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 18, 12, 10),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Detalhes do pedido',
                    style: TextStyle(
                      color: _ink,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Fechar',
                  onPressed: () => Navigator.pop(context, _changed),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: FutureBuilder<AdminOrder>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting &&
                    !snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return _OrdersError(
                    message: '${snapshot.error}'.replaceFirst(
                      'Exception: ',
                      '',
                    ),
                    onRetry: _reload,
                  );
                }
                final order = snapshot.data!;
                return _OrderDetailBody(
                  order: order,
                  busy: _busy,
                  onAccept: () => _accept(order),
                  onReject: () => _reject(order),
                  onChangeStatus: (status) => _changeStatus(order, status),
                  onClose: () => Navigator.pop(context, _changed),
                );
              },
            ),
          ),
        ],
      ),
    ),
  );
}

class _OrderDetailBody extends StatelessWidget {
  const _OrderDetailBody({
    required this.order,
    required this.busy,
    required this.onAccept,
    required this.onReject,
    required this.onChangeStatus,
    required this.onClose,
  });

  final AdminOrder order;
  final bool busy;
  final VoidCallback onAccept;
  final VoidCallback onReject;
  final ValueChanged<String> onChangeStatus;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final nextStatuses = allowedAdminTransitions(order);
    return ListView(
      padding: const EdgeInsets.all(22),
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Pedido #${order.id}',
                    style: const TextStyle(
                      color: _ink,
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Criado em ${_dateTime(order.createdAt)}',
                    style: const TextStyle(color: _muted),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                StatusPill(status: order.status),
                const SizedBox(height: 6),
                PaymentPill(status: order.paymentStatus),
              ],
            ),
          ],
        ),
        const SizedBox(height: 18),
        if (order.rejectionReason != null)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3F2),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              'Motivo da rejeição: ${order.rejectionReason}',
              style: const TextStyle(color: Color(0xFFB42318)),
            ),
          ),
        if (order.rejectionReason != null) const SizedBox(height: 14),
        _Section(
          title: 'Cliente',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                order.customer?.name ?? 'Cliente',
                style: const TextStyle(
                  color: _ink,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 3),
              if (order.customer?.phone != null)
                Text(
                  'Telefone: ${order.customer!.phone!}',
                  style: const TextStyle(color: _muted),
                ),
              if (order.customer?.email != null)
                Text(
                  'E-mail: ${order.customer!.email!}',
                  style: const TextStyle(color: _muted),
                ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        _Section(
          title: 'Produtos',
          child: Column(
            children: [
              for (final item in order.items)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${item.quantity}x ${item.name}',
                          style: const TextStyle(color: _ink),
                        ),
                      ),
                      Text(
                        _money(item.unitPrice),
                        style: const TextStyle(color: _muted),
                      ),
                      const SizedBox(width: 18),
                      SizedBox(
                        width: 100,
                        child: Text(
                          _money(item.subtotal),
                          textAlign: TextAlign.end,
                          style: const TextStyle(
                            color: _ink,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              if (order.items.isEmpty)
                const Text(
                  'Sem itens registados.',
                  style: TextStyle(color: _muted),
                ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        _Section(
          title: 'Pagamento e entrega',
          child: Column(
            children: [
              _InfoRow(
                label: 'Método de pagamento',
                value: order.paymentMethod == null
                    ? 'Não indicado'
                    : '${order.paymentMethod!.displayLabel} · ${order.paymentMethod!.maskedValue}',
              ),
              _InfoRow(
                label: 'Estado do pagamento',
                value: paymentStatusLabel(order.paymentStatus),
              ),
              _InfoRow(
                label: 'Método de entrega',
                value: deliveryLabel(order.deliveryMethod),
              ),
              if (order.isHomeDelivery)
                _InfoRow(
                  label: 'Endereço de entrega',
                  value: order.address == null
                      ? 'Não indicado'
                      : '${order.address!.label ?? 'Endereço'}: ${order.address!.summary}',
                ),
              if (order.notes != null)
                _InfoRow(label: 'Observações', value: order.notes!),
              if (order.couponCode != null)
                _InfoRow(label: 'Cupão', value: order.couponCode!),
            ],
          ),
        ),
        const SizedBox(height: 14),
        _Section(
          title: 'Resumo',
          child: Column(
            children: [
              _InfoRow(label: 'Subtotal', value: _money(order.subtotal)),
              _InfoRow(label: 'Desconto', value: '- ${_money(order.discount)}'),
              _InfoRow(
                label: 'Taxa de entrega',
                value: _money(order.deliveryFee),
              ),
              const Divider(height: 20),
              _InfoRow(
                label: 'Total',
                value: _money(order.total),
                strong: true,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          alignment: WrapAlignment.end,
          children: [
            if (order.status == 'pending') ...[
              FilledButton.tonalIcon(
                onPressed: busy ? null : onReject,
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFFEF3F2),
                  foregroundColor: const Color(0xFFB42318),
                ),
                icon: const Icon(Icons.close),
                label: const Text('Rejeitar pedido'),
              ),
              FilledButton.icon(
                onPressed: busy ? null : onAccept,
                icon: const Icon(Icons.check),
                label: const Text('Aceitar pedido'),
              ),
            ],
            for (final status in nextStatuses)
              if (status != 'cancelled')
                FilledButton.icon(
                  onPressed: busy ? null : () => onChangeStatus(status),
                  icon: Icon(_actionIcon(status)),
                  label: Text(orderStatusLabel(status)),
                ),
            if (nextStatuses.contains('cancelled'))
              OutlinedButton.icon(
                onPressed: busy ? null : () => onChangeStatus('cancelled'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFB42318),
                ),
                icon: const Icon(Icons.cancel_outlined),
                label: const Text('Cancelar pedido'),
              ),
            TextButton(onPressed: onClose, child: const Text('Fechar')),
          ],
        ),
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: const Color(0xFFF9FAFB),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: _line),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: _ink,
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 10),
        child,
      ],
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
        SizedBox(
          width: 160,
          child: Text(label, style: const TextStyle(color: _muted)),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              color: _ink,
              fontWeight: strong ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
        ),
      ],
    ),
  );
}

class _OrdersError extends StatelessWidget {
  const _OrdersError({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off_outlined, size: 40, color: _muted),
          const SizedBox(height: 12),
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 14),
          OutlinedButton(
            onPressed: onRetry,
            child: const Text('Tentar novamente'),
          ),
        ],
      ),
    ),
  );
}

class _EmptyOrders extends StatelessWidget {
  const _EmptyOrders();

  @override
  Widget build(BuildContext context) => const Center(
    child: Padding(
      padding: EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.receipt_long_outlined, size: 46, color: _muted),
          SizedBox(height: 12),
          Text(
            'Ainda não há pedidos para estes filtros.',
            style: TextStyle(color: _ink),
          ),
          SizedBox(height: 4),
          Text(
            'Os pedidos submetidos pelos clientes aparecem aqui.',
            style: TextStyle(color: _muted),
          ),
        ],
      ),
    ),
  );
}

class StatusPill extends StatelessWidget {
  const StatusPill({super.key, required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = statusColors(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        orderStatusLabel(status),
        style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class PaymentPill extends StatelessWidget {
  const PaymentPill({super.key, required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (status) {
      'paid' => (const Color(0xFFE8F8F1), const Color(0xFF12805C)),
      'failed' => (const Color(0xFFFEF3F2), const Color(0xFFB42318)),
      'refund_required' ||
      'refunded' => (const Color(0xFFF3E8FF), const Color(0xFF7A3EAE)),
      _ => (const Color(0xFFFFF3E8), const Color(0xFFB54708)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        'Pagamento: ${paymentStatusLabel(status)}',
        style: TextStyle(color: fg, fontSize: 10, fontWeight: FontWeight.w600),
      ),
    );
  }
}

const orderStatuses = <String, String>{
  'pending': 'Pendente',
  'accepted': 'Aceite',
  'rejected': 'Rejeitado',
  'preparing': 'Em preparação',
  'ready_for_pickup': 'Pronto para levantamento',
  'out_for_delivery': 'Em entrega',
  'completed': 'Concluído',
  'cancelled': 'Cancelado',
};

String orderStatusLabel(String status) => orderStatuses[status] ?? status;

String paymentStatusLabel(String status) => switch (status) {
  'pending' => 'Pendente',
  'paid' => 'Pago',
  'failed' => 'Falhado',
  'refund_required' => 'Reembolso necessário',
  'refunded' => 'Reembolsado',
  _ => status,
};

String deliveryLabel(String method) => switch (method) {
  'home_delivery' => 'Entrega ao domicílio',
  'store_pickup' => 'Levantamento na loja',
  _ => method,
};

(Color, Color) statusColors(String status) => switch (status) {
  'pending' => (const Color(0xFFFFF3E8), const Color(0xFFB54708)),
  'accepted' || 'preparing' => (const Color(0xFFEAF0FF), _blue),
  'ready_for_pickup' => (const Color(0xFFEAF7FB), const Color(0xFF087E8B)),
  'out_for_delivery' => (const Color(0xFFF3E8FF), const Color(0xFF7A3EAE)),
  'completed' => (const Color(0xFFE8F8F1), const Color(0xFF12805C)),
  _ => (const Color(0xFFFEF3F2), const Color(0xFFB42318)),
};

List<String> allowedAdminTransitions(AdminOrder order) {
  final home = order.isHomeDelivery;
  return switch (order.status) {
    'accepted' => const ['preparing', 'cancelled'],
    'preparing' => [
      if (home) 'out_for_delivery' else 'ready_for_pickup',
      'cancelled',
    ],
    'ready_for_pickup' || 'out_for_delivery' => const ['completed'],
    _ => const [],
  };
}

IconData _actionIcon(String status) => switch (status) {
  'preparing' => Icons.restaurant_outlined,
  'ready_for_pickup' => Icons.storefront_outlined,
  'out_for_delivery' => Icons.delivery_dining_outlined,
  'completed' => Icons.task_alt,
  'cancelled' => Icons.cancel_outlined,
  _ => Icons.arrow_forward,
};

String _money(num value) => 'MZN ${value.toStringAsFixed(2)}';

String _shortDate(DateTime date) =>
    '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';

String _dateTime(DateTime? date) {
  if (date == null) return 'Data não disponível';
  final local = date.toLocal();
  final time =
      '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  return '${_shortDate(local)} · $time';
}

Future<String?> _askRejectReason(BuildContext context, int orderId) =>
    showDialog<String>(
      context: context,
      builder: (_) => _RejectReasonDialog(orderId: orderId),
    );

class _RejectReasonDialog extends StatefulWidget {
  const _RejectReasonDialog({required this.orderId});
  final int orderId;

  @override
  State<_RejectReasonDialog> createState() => _RejectReasonDialogState();
}

class _RejectReasonDialogState extends State<_RejectReasonDialog> {
  final _controller = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text('Rejeitar pedido #${widget.orderId}'),
    content: Form(
      key: _formKey,
      child: TextFormField(
        controller: _controller,
        autofocus: true,
        maxLength: 500,
        maxLines: 4,
        decoration: const InputDecoration(
          labelText: 'Motivo da rejeição',
          hintText: 'Ex.: produto indisponível',
          border: OutlineInputBorder(),
        ),
        validator: (value) => value == null || value.trim().length < 3
            ? 'Indica um motivo com pelo menos 3 caracteres.'
            : null,
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancelar'),
      ),
      FilledButton.tonalIcon(
        style: FilledButton.styleFrom(
          backgroundColor: const Color(0xFFFEF3F2),
          foregroundColor: const Color(0xFFB42318),
        ),
        onPressed: () {
          if (!_formKey.currentState!.validate()) return;
          Navigator.pop(context, _controller.text.trim());
        },
        icon: const Icon(Icons.close),
        label: const Text('Rejeitar'),
      ),
    ],
  );
}
