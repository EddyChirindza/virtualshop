import 'package:flutter/material.dart';

import '../../data/dashboard_repository.dart';
import '../../models/dashboard_data.dart';
import '../../../catalog/data/catalog_repository.dart';
import '../../../catalog/presentation/screens/categories_screen.dart';
import '../../../catalog/presentation/screens/products_screen.dart';
import '../../../customers/data/customers_repository.dart';
import '../../../customers/presentation/screens/customers_screen.dart';
import '../../../notifications/data/admin_notifications_repository.dart';
import '../../../notifications/presentation/screens/admin_notifications_screen.dart';
import '../../../orders/data/orders_repository.dart';
import '../../../orders/presentation/screens/orders_screen.dart';

const _ink = Color(0xFF182230);
const _muted = Color(0xFF667085);
const _line = Color(0xFFEAECF0);
const _blue = Color(0xFF3157D5);

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, required this.repository, required this.catalogRepository, required this.customersRepository, required this.notificationsRepository, required this.ordersRepository, required this.onLogout});
  final DashboardRepository repository;
  final CatalogRepository catalogRepository;
  final CustomersRepository customersRepository;
  final AdminNotificationsRepository notificationsRepository;
  final OrdersRepository ordersRepository;
  final VoidCallback onLogout;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late Future<DashboardData> _future;
  String _period = '30d';
  String _section = 'dashboard';
  int _refreshVersion = 0;

  @override
  void initState() {
    super.initState();
    _future = widget.repository.load();
  }

  void _reload() => setState(() => _future = widget.repository.load(period: _period));

  void _refreshSection() {
    if (_section == 'dashboard') {
      _reload();
      return;
    }
    setState(() => _refreshVersion++);
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final compact = width < 900;
    return Scaffold(
      body: Row(children: [
        if (!compact) _SideNavigation(selected: _section, onSelect: (section) => setState(() => _section = section), onLogout: widget.onLogout),
        Expanded(child: Column(children: [
          _TopBar(compact: compact, section: _section, onLogout: widget.onLogout, onSelect: (section) => setState(() => _section = section), onRefresh: _refreshSection),
          Expanded(child: _section == 'customers'
              ? Padding(padding: EdgeInsets.fromLTRB(compact ? 18 : 36, 28, compact ? 18 : 36, 24), child: CustomersScreen(key: ValueKey('customers-$_refreshVersion'), repository: widget.customersRepository))
              : _section == 'orders'
              ? Padding(padding: EdgeInsets.fromLTRB(compact ? 18 : 36, 28, compact ? 18 : 36, 24), child: OrdersScreen(key: ValueKey('orders-$_refreshVersion'), repository: widget.ordersRepository))
              : _section == 'products'
              ? Padding(padding: EdgeInsets.fromLTRB(compact ? 18 : 36, 28, compact ? 18 : 36, 24), child: ProductsScreen(key: ValueKey('products-$_refreshVersion'), repository: widget.catalogRepository))
              : _section == 'categories'
                  ? Padding(padding: EdgeInsets.fromLTRB(compact ? 18 : 36, 28, compact ? 18 : 36, 24), child: CategoriesScreen(key: ValueKey('categories-$_refreshVersion'), repository: widget.catalogRepository))
                  : _section == 'notifications'
                      ? Padding(padding: EdgeInsets.fromLTRB(compact ? 18 : 36, 28, compact ? 18 : 36, 24), child: AdminNotificationsScreen(key: ValueKey('notifications-$_refreshVersion'), repository: widget.notificationsRepository))
                  : FutureBuilder<DashboardData>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return _LoadError(message: _apiMessage(snapshot.error!), onRetry: _reload);
              }
              final data = snapshot.data!;
              return RefreshIndicator(
                onRefresh: () async => _reload(),
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: EdgeInsets.fromLTRB(compact ? 18 : 36, 28, compact ? 18 : 36, 36),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 1500),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        _PageHeading(period: _period, onPeriodChanged: (value) {
                          setState(() {
                            _period = value;
                            _future = widget.repository.load(period: value);
                          });
                        }),
                        const SizedBox(height: 24),
                        _MetricGrid(data: data, width: width),
                        const SizedBox(height: 22),
                        _MainPanels(data: data, width: width),
                      ]),
                    ),
                  ),
                ),
              );
            },
          )),
        ])),
      ]),
    );
  }

  String _apiMessage(Object error) {
    final text = error.toString();
    if (text.contains('404')) return 'O endpoint administrativo ainda não está disponível na API.';
    if (text.contains('401')) return 'A sessão expirou. Entra novamente.';
    if (text.contains('SocketException') || text.contains('connection')) return 'Não foi possível ligar à API.';
    return 'Não foi possível carregar os dados do dashboard. Confirma a API e tenta novamente.';
  }
}

class _SideNavigation extends StatelessWidget {
  const _SideNavigation({required this.selected, required this.onSelect, required this.onLogout});
  final String selected;
  final ValueChanged<String> onSelect;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) => Container(
        width: 250,
        color: const Color(0xFF172554),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Padding(padding: EdgeInsets.fromLTRB(24, 28, 20, 34), child: Row(children: [Icon(Icons.storefront_rounded, color: Colors.white, size: 28), SizedBox(width: 12), Text('VirtualShop', style: TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w700))])),
          const Padding(padding: EdgeInsets.fromLTRB(24, 0, 20, 10), child: Text('MENU', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2))),
          _NavItem(icon: Icons.grid_view_rounded, title: 'Dashboard', selected: selected == 'dashboard', onTap: () => onSelect('dashboard')),
          _NavItem(icon: Icons.receipt_long_outlined, title: 'Pedidos', selected: selected == 'orders', onTap: () => onSelect('orders')),
          _NavItem(icon: Icons.inventory_2_outlined, title: 'Produtos', selected: selected == 'products', onTap: () => onSelect('products')),
          _NavItem(icon: Icons.category_outlined, title: 'Categorias', selected: selected == 'categories', onTap: () => onSelect('categories')),
          _NavItem(icon: Icons.people_outline, title: 'Clientes', selected: selected == 'customers', onTap: () => onSelect('customers')),
          _NavItem(icon: Icons.notifications_none_rounded, title: 'Notificações', selected: selected == 'notifications', onTap: () => onSelect('notifications')),
          const Spacer(),
          const Divider(color: Color(0xFF334155), height: 1),
          ListTile(leading: const Icon(Icons.logout_rounded, color: Color(0xFFCBD5E1)), title: const Text('Terminar sessão', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 14)), onTap: onLogout),
          const SizedBox(height: 12),
        ]),
      );
}

class _NavItem extends StatelessWidget {
  const _NavItem({required this.icon, required this.title, this.selected = false, this.onTap});
  final IconData icon;
  final String title;
  final bool selected;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
        child: Container(
          decoration: BoxDecoration(color: selected ? const Color(0xFF3157D5) : Colors.transparent, borderRadius: BorderRadius.circular(9)),
          child: ListTile(onTap: onTap, dense: true, leading: Icon(icon, size: 20, color: selected ? Colors.white : const Color(0xFFCBD5E1)), title: Text(title, style: TextStyle(color: selected ? Colors.white : const Color(0xFFCBD5E1), fontSize: 14, fontWeight: selected ? FontWeight.w600 : FontWeight.w400))),
        ),
      );
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.compact, required this.section, required this.onLogout, required this.onSelect, required this.onRefresh});
  final bool compact;
  final String section;
  final VoidCallback onLogout;
  final ValueChanged<String> onSelect;
  final VoidCallback onRefresh;
  @override
  Widget build(BuildContext context) => Container(
        height: 72,
        padding: EdgeInsets.symmetric(horizontal: compact ? 18 : 36),
        decoration: const BoxDecoration(color: Colors.white, border: Border(bottom: BorderSide(color: _line))),
        child: Row(children: [
          if (compact) PopupMenuButton<String>(onSelected: onSelect, itemBuilder: (_) => const [PopupMenuItem(value: 'dashboard', child: Text('Dashboard')), PopupMenuItem(value: 'orders', child: Text('Pedidos')), PopupMenuItem(value: 'products', child: Text('Produtos')), PopupMenuItem(value: 'categories', child: Text('Categorias')), PopupMenuItem(value: 'customers', child: Text('Clientes')), PopupMenuItem(value: 'notifications', child: Text('Notificações'))], child: const Icon(Icons.storefront_rounded, color: _blue)),
          if (compact) const SizedBox(width: 10),
          Text(_sectionTitle(section), style: const TextStyle(color: _ink, fontWeight: FontWeight.w600)),
          const Spacer(),
          IconButton(tooltip: 'Atualizar dados', onPressed: onRefresh, icon: const Icon(Icons.refresh_rounded, color: _muted)),
          const Icon(Icons.notifications_none_rounded, color: _muted),
          const SizedBox(width: 18),
          const CircleAvatar(radius: 17, backgroundColor: Color(0xFFE8EDFF), child: Icon(Icons.person_outline, size: 19, color: _blue)),
          if (compact) IconButton(tooltip: 'Terminar sessão', onPressed: onLogout, icon: const Icon(Icons.logout_rounded, size: 19)),
        ]),
      );
}

class _PageHeading extends StatelessWidget {
  const _PageHeading({required this.period, required this.onPeriodChanged});
  final String period;
  final ValueChanged<String> onPeriodChanged;
  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, constraints) {
        final narrow = constraints.maxWidth < 560;
        const heading = Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Dashboard', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: _ink)), SizedBox(height: 5), Text('Resumo do desempenho da tua loja.', style: TextStyle(color: _muted, fontSize: 14))]);
        final selector = Container(padding: const EdgeInsets.symmetric(horizontal: 12), decoration: BoxDecoration(color: Colors.white, border: Border.all(color: _line), borderRadius: BorderRadius.circular(9)), child: DropdownButtonHideUnderline(child: DropdownButton<String>(value: period, items: const [DropdownMenuItem(value: '7d', child: Text('Últimos 7 dias')), DropdownMenuItem(value: '30d', child: Text('Últimos 30 dias')), DropdownMenuItem(value: '90d', child: Text('Últimos 90 dias'))], onChanged: (value) { if (value != null) onPeriodChanged(value); })));
        if (narrow) return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [heading, const SizedBox(height: 16), selector]);
        return Row(children: [const Expanded(child: heading), selector]);
      });
}

class _MetricGrid extends StatelessWidget {
  const _MetricGrid({required this.data, required this.width});
  final DashboardData data;
  final double width;
  @override
  Widget build(BuildContext context) {
    final columns = width >= 1400 ? 5 : width >= 680 ? 2 : 1;
    final cards = [
      _MetricCard(title: 'Vendas totais', value: _money(data.revenue), note: 'No período selecionado', icon: Icons.payments_outlined, tint: const Color(0xFFE8F8F1), color: const Color(0xFF12805C)),
      _MetricCard(title: 'Pedidos', value: '${data.orderCount}', note: '${data.pendingOrders} por confirmar', icon: Icons.shopping_bag_outlined, tint: const Color(0xFFEAF0FF), color: _blue),
      _MetricCard(title: 'Stock baixo', value: '${data.lowStockCount}', note: 'Produtos a repor', icon: Icons.inventory_2_outlined, tint: const Color(0xFFFFF3E8), color: const Color(0xFFB54708)),
      _MetricCard(title: 'Clientes', value: '${data.customerCount}', note: 'Contas registadas', icon: Icons.people_outline, tint: const Color(0xFFF3E8FF), color: const Color(0xFF7A3EAE)),
      _MetricCard(title: 'Produtos', value: '${data.productCount}', note: 'No catálogo', icon: Icons.storefront_outlined, tint: const Color(0xFFEAF7FB), color: const Color(0xFF087E8B)),
    ];
    return LayoutBuilder(builder: (context, constraints) => Wrap(spacing: 16, runSpacing: 16, children: cards.map((card) => SizedBox(width: (constraints.maxWidth - 16 * (columns - 1)) / columns, child: card)).toList()));
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.title, required this.value, required this.note, required this.icon, required this.tint, required this.color});
  final String title, value, note;
  final IconData icon;
  final Color tint, color;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: Colors.white, border: Border.all(color: _line), borderRadius: BorderRadius.circular(13)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [Expanded(child: Text(title, style: const TextStyle(color: _muted, fontSize: 13, fontWeight: FontWeight.w500))), Container(width: 38, height: 38, decoration: BoxDecoration(color: tint, borderRadius: BorderRadius.circular(10)), child: Icon(icon, size: 19, color: color))]),
          const SizedBox(height: 15),
          Text(value, style: const TextStyle(fontSize: 27, fontWeight: FontWeight.w700, color: _ink)),
          const SizedBox(height: 6),
          Text(note, style: const TextStyle(fontSize: 12, color: _muted)),
        ]),
      );
}

class _MainPanels extends StatelessWidget {
  const _MainPanels({required this.data, required this.width});
  final DashboardData data;
  final double width;
  @override
  Widget build(BuildContext context) {
    final narrow = width < 1050;
    final chart = _Panel(title: 'Vendas ao longo do tempo', trailing: const Text('MZN', style: TextStyle(color: _muted, fontSize: 12)), child: SizedBox(height: 250, child: _RevenueChart(points: data.revenueSeries)));
    final stock = _Panel(title: 'Stock a repor', trailing: TextButton(onPressed: null, child: const Text('Ver produtos')), child: _StockList(products: data.lowStockProducts));
    final orders = _Panel(title: 'Pedidos recentes', trailing: TextButton(onPressed: null, child: const Text('Ver todos')), child: _OrderList(orders: data.recentOrders));
    if (narrow) return Column(children: [chart, const SizedBox(height: 18), orders, const SizedBox(height: 18), stock]);
    return Column(children: [Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(flex: 3, child: chart), const SizedBox(width: 18), Expanded(flex: 2, child: stock)]), const SizedBox(height: 18), orders]);
  }
}

class _Panel extends StatelessWidget {
  const _Panel({required this.title, required this.trailing, required this.child});
  final String title;
  final Widget trailing, child;
  @override
  Widget build(BuildContext context) => Container(width: double.infinity, padding: const EdgeInsets.all(20), decoration: BoxDecoration(color: Colors.white, border: Border.all(color: _line), borderRadius: BorderRadius.circular(13)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(children: [Expanded(child: Text(title, style: const TextStyle(color: _ink, fontWeight: FontWeight.w600, fontSize: 15))), trailing]), const SizedBox(height: 16), child]));
}

class _RevenueChart extends StatelessWidget {
  const _RevenueChart({required this.points});
  final List<RevenuePoint> points;
  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) return const Center(child: Text('Sem vendas neste período.', style: TextStyle(color: _muted)));
    return CustomPaint(painter: _BarChartPainter(points), child: const SizedBox.expand());
  }
}

class _BarChartPainter extends CustomPainter {
  _BarChartPainter(this.points);
  final List<RevenuePoint> points;
  @override
  void paint(Canvas canvas, Size size) {
    const left = 8.0, bottom = 24.0, top = 10.0;
    final chartHeight = size.height - bottom - top;
    final maxValue = points.map((e) => e.value).fold<double>(0, (a, b) => a > b ? a : b);
    final count = points.length > 14 ? 14 : points.length;
    final visible = points.length > count ? points.sublist(points.length - count) : points;
    final width = size.width / (visible.length * 1.8);
    final gap = (size.width - width * visible.length) / (visible.length + 1);
    final gridPaint = Paint()..color = _line..strokeWidth = 1;
    final barPaint = Paint()..color = _blue;
    final text = TextPainter(textDirection: TextDirection.ltr);
    for (var i = 0; i < 4; i++) {
      final y = top + chartHeight * i / 3;
      canvas.drawLine(Offset(left, y), Offset(size.width, y), gridPaint);
    }
    for (var i = 0; i < visible.length; i++) {
      final point = visible[i];
      final height = maxValue == 0 ? 0.0 : chartHeight * point.value / maxValue;
      final x = gap + i * (width + gap);
      final rect = RRect.fromRectAndRadius(Rect.fromLTWH(x, top + chartHeight - height, width, height), const Radius.circular(4));
      canvas.drawRRect(rect, barPaint);
      if (visible.length <= 7 || i % 2 == 0 || i == visible.length - 1) {
        text.text = TextSpan(text: point.label, style: const TextStyle(color: _muted, fontSize: 10));
        text.layout(maxWidth: width + gap);
        text.paint(canvas, Offset(x + width / 2 - text.width / 2, size.height - 18));
      }
    }
  }
  @override
  bool shouldRepaint(covariant _BarChartPainter oldDelegate) => oldDelegate.points != points;
}

class _OrderList extends StatelessWidget {
  const _OrderList({required this.orders});
  final List<AdminOrderSummary> orders;
  @override
  Widget build(BuildContext context) {
    if (orders.isEmpty) return const _EmptyPanel(message: 'Ainda não há pedidos para mostrar.');
    return Column(children: [
      if (MediaQuery.sizeOf(context).width > 650) const Padding(padding: EdgeInsets.only(bottom: 10), child: Row(children: [Expanded(flex: 2, child: _TableLabel('PEDIDO')), Expanded(flex: 3, child: _TableLabel('CLIENTE')), Expanded(flex: 2, child: _TableLabel('ESTADO')), Expanded(flex: 2, child: _TableLabel('TOTAL'))])),
      ...orders.map((order) => Container(padding: const EdgeInsets.symmetric(vertical: 13), decoration: const BoxDecoration(border: Border(top: BorderSide(color: _line))), child: Row(children: [Expanded(flex: 2, child: Text('#${order.id}', style: const TextStyle(color: _ink, fontWeight: FontWeight.w600))), Expanded(flex: 3, child: Text(order.customer, overflow: TextOverflow.ellipsis, style: const TextStyle(color: _muted))), Expanded(flex: 2, child: _StatusPill(order.status)), Expanded(flex: 2, child: Text(_money(order.total), textAlign: TextAlign.end, style: const TextStyle(color: _ink, fontWeight: FontWeight.w600)))]))),
    ]);
  }
}

class _StockList extends StatelessWidget {
  const _StockList({required this.products});
  final List<LowStockProduct> products;
  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) return const _EmptyPanel(message: 'Não há produtos com stock baixo.');
    return Column(children: products.map((product) => Padding(padding: const EdgeInsets.symmetric(vertical: 10), child: Row(children: [Container(width: 34, height: 34, decoration: BoxDecoration(color: const Color(0xFFFFF3E8), borderRadius: BorderRadius.circular(9)), child: const Icon(Icons.inventory_2_outlined, size: 17, color: Color(0xFFB54708))), const SizedBox(width: 11), Expanded(child: Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, color: _ink))), const SizedBox(width: 6), Text(product.status == 'out_of_stock' ? 'Esgotado' : 'Últimas unidades', style: const TextStyle(color: Color(0xFFB54708), fontWeight: FontWeight.w700, fontSize: 12))]))).toList());
  }
}

class _TableLabel extends StatelessWidget {
  const _TableLabel(this.label);
  final String label;
  @override
  Widget build(BuildContext context) => Text(label, style: const TextStyle(color: _muted, fontSize: 10, letterSpacing: .7, fontWeight: FontWeight.w700));
}

class _StatusPill extends StatelessWidget {
  const _StatusPill(this.status);
  final String status;
  @override
  Widget build(BuildContext context) {
    final (label, bg, fg) = switch (status) {
      'pending' => ('Pendente', const Color(0xFFFFF3E8), const Color(0xFFB54708)),
      'accepted' || 'preparing' => ('Em curso', const Color(0xFFEAF0FF), _blue),
      'ready_for_pickup' => ('Pronto', const Color(0xFFEAF7FB), const Color(0xFF087E8B)),
      'out_for_delivery' => ('Em entrega', const Color(0xFFF3E8FF), const Color(0xFF7A3EAE)),
      'completed' => ('Concluído', const Color(0xFFE8F8F1), const Color(0xFF12805C)),
      'rejected' => ('Rejeitado', const Color(0xFFFEF3F2), const Color(0xFFB42318)),
      _ => ('Cancelado', const Color(0xFFFEF3F2), const Color(0xFFB42318)),
    };
    return Align(alignment: Alignment.centerLeft, child: Container(padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5), decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)), child: Text(label, style: TextStyle(color: fg, fontSize: 10, fontWeight: FontWeight.w600))));
  }
}

class _EmptyPanel extends StatelessWidget {
  const _EmptyPanel({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Container(height: 90, alignment: Alignment.center, child: Text(message, style: const TextStyle(color: _muted, fontSize: 13)));
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.cloud_off_outlined, size: 40, color: _muted), const SizedBox(height: 14), Text(message, textAlign: TextAlign.center, style: const TextStyle(color: _ink)), const SizedBox(height: 16), OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Tentar novamente'))])));
}

String _money(num value) => 'MZN ${value.toStringAsFixed(2)}';

String _sectionTitle(String section) => switch (section) {
      'products' => 'Produtos',
      'categories' => 'Categorias',
      'orders' => 'Pedidos',
      'customers' => 'Clientes',
      'notifications' => 'Notificações',
      _ => 'Painel administrativo',
    };
