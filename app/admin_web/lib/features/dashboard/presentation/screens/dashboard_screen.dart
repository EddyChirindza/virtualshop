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
import '../../../../core/theme/app_colors.dart';

const _ink = AppColors.textPrimary;
const _muted = AppColors.textSecondary;
const _line = AppColors.border;
const _blue = AppColors.accentEnd;

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({
    super.key,
    required this.repository,
    required this.catalogRepository,
    required this.customersRepository,
    required this.notificationsRepository,
    required this.ordersRepository,
    required this.onLogout,
  });
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
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  late Future<DashboardData> _future;
  String _period = '30d';
  String _section = 'dashboard';
  int _refreshVersion = 0;

  @override
  void initState() {
    super.initState();
    _future = widget.repository.load();
  }

  void _reload() =>
      setState(() => _future = widget.repository.load(period: _period));

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
      key: _scaffoldKey,
      backgroundColor: AppColors.background,
      drawer: compact
          ? Drawer(
              width: 252,
              child: SafeArea(
                child: _SideNavigation(
                  selected: _section,
                  onSelect: (section) {
                    setState(() => _section = section);
                    Navigator.of(context).pop();
                  },
                  onLogout: widget.onLogout,
                ),
              ),
            )
          : null,
      body: Padding(
        padding: EdgeInsets.all(compact ? 0 : 16),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(compact ? 0 : 24),
            boxShadow: const [
              BoxShadow(
                color: AppColors.shadow,
                blurRadius: 30,
                offset: Offset(0, 8),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Row(
            children: [
              if (!compact)
                _SideNavigation(
                  selected: _section,
                  onSelect: (section) => setState(() => _section = section),
                  onLogout: widget.onLogout,
                ),
              Expanded(
                child: Column(
                  children: [
                    _TopBar(
                      compact: compact,
                      section: _section,
                      onLogout: widget.onLogout,
                      onSelect: (section) => setState(() => _section = section),
                      onRefresh: _refreshSection,
                      onMenu: () => _scaffoldKey.currentState?.openDrawer(),
                    ),
                    Expanded(
                      child: _section == 'customers'
                          ? Padding(
                              padding: EdgeInsets.fromLTRB(
                                compact ? 18 : 36,
                                28,
                                compact ? 18 : 36,
                                24,
                              ),
                              child: CustomersScreen(
                                key: ValueKey('customers-$_refreshVersion'),
                                repository: widget.customersRepository,
                              ),
                            )
                          : _section == 'orders'
                          ? Padding(
                              padding: EdgeInsets.fromLTRB(
                                compact ? 18 : 36,
                                28,
                                compact ? 18 : 36,
                                24,
                              ),
                              child: OrdersScreen(
                                key: ValueKey('orders-$_refreshVersion'),
                                repository: widget.ordersRepository,
                              ),
                            )
                          : _section == 'products'
                          ? Padding(
                              padding: EdgeInsets.fromLTRB(
                                compact ? 18 : 36,
                                28,
                                compact ? 18 : 36,
                                24,
                              ),
                              child: ProductsScreen(
                                key: ValueKey('products-$_refreshVersion'),
                                repository: widget.catalogRepository,
                              ),
                            )
                          : _section == 'categories'
                          ? Padding(
                              padding: EdgeInsets.fromLTRB(
                                compact ? 18 : 36,
                                28,
                                compact ? 18 : 36,
                                24,
                              ),
                              child: CategoriesScreen(
                                key: ValueKey('categories-$_refreshVersion'),
                                repository: widget.catalogRepository,
                              ),
                            )
                          : _section == 'notifications'
                          ? Padding(
                              padding: EdgeInsets.fromLTRB(
                                compact ? 18 : 36,
                                28,
                                compact ? 18 : 36,
                                24,
                              ),
                              child: AdminNotificationsScreen(
                                key: ValueKey('notifications-$_refreshVersion'),
                                repository: widget.notificationsRepository,
                              ),
                            )
                          : FutureBuilder<DashboardData>(
                              future: _future,
                              builder: (context, snapshot) {
                                if (snapshot.connectionState ==
                                        ConnectionState.waiting &&
                                    !snapshot.hasData) {
                                  return const Center(
                                    child: CircularProgressIndicator(),
                                  );
                                }
                                if (snapshot.hasError) {
                                  return _LoadError(
                                    message: _apiMessage(snapshot.error!),
                                    onRetry: _reload,
                                  );
                                }
                                final data = snapshot.data!;
                                return RefreshIndicator(
                                  onRefresh: () async => _reload(),
                                  child: SingleChildScrollView(
                                    physics:
                                        const AlwaysScrollableScrollPhysics(),
                                    padding: EdgeInsets.fromLTRB(
                                      compact ? 18 : 36,
                                      28,
                                      compact ? 18 : 36,
                                      36,
                                    ),
                                    child: Center(
                                      child: ConstrainedBox(
                                        constraints: const BoxConstraints(
                                          maxWidth: 1500,
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            _PageHeading(
                                              period: _period,
                                              onPeriodChanged: (value) {
                                                setState(() {
                                                  _period = value;
                                                  _future = widget.repository
                                                      .load(period: value);
                                                });
                                              },
                                            ),
                                            const SizedBox(height: 24),
                                            _MetricGrid(
                                              data: data,
                                              width: width,
                                            ),
                                            const SizedBox(height: 22),
                                            _MainPanels(
                                              data: data,
                                              width: width,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _apiMessage(Object error) {
    final text = error.toString();
    if (text.contains('404'))
      return 'O endpoint administrativo ainda não está disponível na API.';
    if (text.contains('401')) return 'A sessão expirou. Entra novamente.';
    if (text.contains('SocketException') || text.contains('connection'))
      return 'Não foi possível ligar à API.';
    return 'Não foi possível carregar os dados do dashboard. Confirma a API e tenta novamente.';
  }
}

class _SideNavigation extends StatelessWidget {
  const _SideNavigation({
    required this.selected,
    required this.onSelect,
    required this.onLogout,
  });
  final String selected;
  final ValueChanged<String> onSelect;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) => Container(
    width: 220,
    color: AppColors.surface,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(22, 28, 18, 34),
          child: Row(
            children: [
              Icon(
                Icons.storefront_rounded,
                color: AppColors.accentEnd,
                size: 25,
              ),
              SizedBox(width: 10),
              Text(
                'VirtualShop',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
        const Padding(
          padding: EdgeInsets.fromLTRB(22, 0, 20, 10),
          child: Text(
            'MENU',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
            ),
          ),
        ),
        _NavItem(
          icon: Icons.grid_view_rounded,
          title: 'Dashboard',
          selected: selected == 'dashboard',
          onTap: () => onSelect('dashboard'),
        ),
        _NavItem(
          icon: Icons.inventory_2_outlined,
          title: 'Produtos',
          selected: selected == 'products',
          onTap: () => onSelect('products'),
        ),
        _NavItem(
          icon: Icons.category_outlined,
          title: 'Categorias',
          selected: selected == 'categories',
          onTap: () => onSelect('categories'),
        ),
        _NavItem(
          icon: Icons.receipt_long_outlined,
          title: 'Encomendas',
          selected: selected == 'orders',
          onTap: () => onSelect('orders'),
        ),
        _NavItem(
          icon: Icons.people_outline,
          title: 'Clientes',
          selected: selected == 'customers',
          onTap: () => onSelect('customers'),
        ),
        _NavItem(
          icon: Icons.notifications_none_rounded,
          title: 'Notificações',
          selected: selected == 'notifications',
          onTap: () => onSelect('notifications'),
        ),
        const _NavItem(
          icon: Icons.settings_outlined,
          title: 'Definições',
          selected: false,
        ),
        const Spacer(),
        const Divider(color: AppColors.border, height: 1),
        ListTile(
          leading: const Icon(
            Icons.logout_rounded,
            color: AppColors.textSecondary,
          ),
          title: const Text(
            'Terminar sessão',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
          ),
          onTap: onLogout,
        ),
        const SizedBox(height: 12),
      ],
    ),
  );
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.title,
    this.selected = false,
    this.onTap,
  });
  final IconData icon;
  final String title;
  final bool selected;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
    child: Container(
      decoration: BoxDecoration(
        gradient: selected ? AppColors.accentGradient : null,
        color: selected ? null : Colors.transparent,
        borderRadius: BorderRadius.circular(11),
      ),
      child: ListTile(
        onTap: onTap,
        dense: true,
        leading: Icon(
          icon,
          size: 19,
          color: selected ? Colors.white : AppColors.textSecondary,
        ),
        title: Text(
          title,
          style: TextStyle(
            color: selected ? Colors.white : AppColors.textSecondary,
            fontSize: 13,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
          ),
        ),
      ),
    ),
  );
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.compact,
    required this.section,
    required this.onLogout,
    required this.onSelect,
    required this.onRefresh,
    required this.onMenu,
  });
  final bool compact;
  final String section;
  final VoidCallback onLogout;
  final ValueChanged<String> onSelect;
  final VoidCallback onRefresh;
  final VoidCallback onMenu;
  @override
  Widget build(BuildContext context) => Container(
    height: 76,
    padding: EdgeInsets.symmetric(horizontal: compact ? 16 : 30),
    decoration: const BoxDecoration(color: Colors.white),
    child: Row(
      children: [
        _TopIconButton(
          icon: compact ? Icons.menu_rounded : Icons.tune_rounded,
          onPressed: compact ? onMenu : onRefresh,
        ),
        const SizedBox(width: 10),
        if (!compact) ...[
          _TopDropdown(label: 'MZN'),
          const SizedBox(width: 8),
          _TopDropdown(label: 'PT'),
        ],
        if (compact)
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(left: 12),
              child: Text(
                _sectionTitle(section),
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        const Spacer(),
        _TopIconButton(
          icon: Icons.nightlight_round,
          onPressed: () {
            /* TODO: alternar tema claro/escuro */
          },
        ),
        const SizedBox(width: 7),
        _TopIconButton(
          icon: Icons.notifications_none_rounded,
          onPressed: () => onSelect('notifications'),
        ),
        const SizedBox(width: 14),
        const CircleAvatar(
          radius: 17,
          backgroundColor: AppColors.accentSurface,
          child: Icon(
            Icons.person_outline,
            size: 19,
            color: AppColors.accentEnd,
          ),
        ),
        if (!compact) const SizedBox(width: 9),
        if (!compact)
          const Text(
            'Administrador',
            style: TextStyle(
              fontSize: 12,
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w600,
            ),
          ),
        if (compact)
          IconButton(
            tooltip: 'Terminar sessão',
            onPressed: onLogout,
            icon: const Icon(
              Icons.logout_rounded,
              size: 19,
              color: AppColors.textSecondary,
            ),
          ),
      ],
    ),
  );
}

class _TopIconButton extends StatelessWidget {
  const _TopIconButton({required this.icon, required this.onPressed});
  final IconData icon;
  final VoidCallback onPressed;
  @override
  Widget build(BuildContext context) => IconButton(
    onPressed: onPressed,
    icon: Icon(icon, size: 19, color: AppColors.textSecondary),
    style: IconButton.styleFrom(
      backgroundColor: AppColors.background,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
    ),
  );
}

class _TopDropdown extends StatelessWidget {
  const _TopDropdown({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
    decoration: BoxDecoration(
      color: AppColors.background,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(width: 5),
        const Icon(
          Icons.keyboard_arrow_down_rounded,
          size: 15,
          color: AppColors.textSecondary,
        ),
      ],
    ),
  );
}

class _PageHeading extends StatelessWidget {
  const _PageHeading({required this.period, required this.onPeriodChanged});
  final String period;
  final ValueChanged<String> onPeriodChanged;
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final narrow = constraints.maxWidth < 560;
      const heading = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Bem-vindo, Administrador',
            style: TextStyle(
              fontSize: 25,
              fontWeight: FontWeight.w600,
              color: _ink,
            ),
          ),
          SizedBox(height: 5),
          Text(
            'Aqui está o resumo da tua loja.',
            style: TextStyle(color: _muted, fontSize: 13),
          ),
        ],
      );
      final selector = Container(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: _line),
          borderRadius: BorderRadius.circular(11),
        ),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            value: period,
            items: const [
              DropdownMenuItem(value: '7d', child: Text('Últimos 7 dias')),
              DropdownMenuItem(value: '30d', child: Text('Este mês')),
              DropdownMenuItem(value: '90d', child: Text('Últimos 90 dias')),
            ],
            onChanged: (value) {
              if (value != null) onPeriodChanged(value);
            },
          ),
        ),
      );
      if (narrow)
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [heading, const SizedBox(height: 16), selector],
        );
      return Row(
        children: [
          const Expanded(child: heading),
          selector,
        ],
      );
    },
  );
}

class _MetricGrid extends StatelessWidget {
  const _MetricGrid({required this.data, required this.width});
  final DashboardData data;
  final double width;
  @override
  Widget build(BuildContext context) {
    final columns = width >= 1150
        ? 3
        : width >= 680
        ? 2
        : 1;
    final cards = [
      _MetricCard(
        title: 'Vendas',
        value: _money(data.revenue),
        note: 'No período selecionado',
        icon: Icons.payments_outlined,
        tint: AppColors.accentSurface,
        color: AppColors.accentEnd,
      ),
      _MetricCard(
        title: 'Encomendas',
        value: '${data.orderCount}',
        note: '${data.pendingOrders} pendentes',
        icon: Icons.shopping_bag_outlined,
        tint: AppColors.accentSurfaceViolet,
        color: AppColors.accentEnd,
      ),
      _MetricCard(
        title: 'Clientes',
        value: '${data.customerCount}',
        note: 'Contas registadas',
        icon: Icons.people_outline,
        tint: AppColors.accentSurfaceBlue,
        color: AppColors.accentBlue,
      ),
    ];
    return LayoutBuilder(
      builder: (context, constraints) => Wrap(
        spacing: 16,
        runSpacing: 16,
        children: cards
            .map(
              (card) => SizedBox(
                width: (constraints.maxWidth - 16 * (columns - 1)) / columns,
                child: card,
              ),
            )
            .toList(),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.title,
    required this.value,
    required this.note,
    required this.icon,
    required this.tint,
    required this.color,
  });
  final String title, value, note;
  final IconData icon;
  final Color tint, color;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(17),
      boxShadow: const [
        BoxShadow(
          color: AppColors.shadow,
          blurRadius: 20,
          offset: Offset(0, 7),
        ),
      ],
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  color: _muted,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: tint,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 19, color: color),
            ),
          ],
        ),
        const SizedBox(height: 15),
        Text(
          value,
          style: const TextStyle(
            fontSize: 27,
            fontWeight: FontWeight.w700,
            color: _ink,
          ),
        ),
        const SizedBox(height: 6),
        Text(note, style: const TextStyle(fontSize: 12, color: _muted)),
      ],
    ),
  );
}

class _MainPanels extends StatelessWidget {
  const _MainPanels({required this.data, required this.width});
  final DashboardData data;
  final double width;
  @override
  Widget build(BuildContext context) {
    final narrow = width < 1050;
    final chart = _Panel(
      title: 'Vendas ao longo do tempo',
      trailing: const Text(
        'MZN',
        style: TextStyle(color: _muted, fontSize: 12),
      ),
      child: SizedBox(
        height: 220,
        child: _RevenueChart(points: data.revenueSeries),
      ),
    );
    final stock = _Panel(
      title: 'Stock a repor',
      trailing: TextButton(onPressed: null, child: const Text('Ver produtos')),
      child: _StockList(products: data.lowStockProducts),
    );
    final orders = _Panel(
      title: 'Pedidos recentes',
      trailing: TextButton(onPressed: null, child: const Text('Ver todos')),
      child: _OrderList(orders: data.recentOrders),
    );
    final summary = _AdminSummaryCard(data: data);
    if (narrow)
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          summary,
          const SizedBox(height: 16),
          const _GradientBanner(),
          const SizedBox(height: 16),
          chart,
          const SizedBox(height: 16),
          stock,
          const SizedBox(height: 16),
          orders,
        ],
      );
    return Column(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(width: 285, child: summary),
            const SizedBox(width: 18),
            Expanded(
              child: Column(
                children: [
                  const _GradientBanner(),
                  const SizedBox(height: 18),
                  chart,
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(flex: 3, child: orders),
            const SizedBox(width: 18),
            Expanded(flex: 2, child: stock),
          ],
        ),
      ],
    );
  }
}

class _AdminSummaryCard extends StatelessWidget {
  const _AdminSummaryCard({required this.data});
  final DashboardData data;
  @override
  Widget build(BuildContext context) {
    final pending = data.orderCount == 0
        ? 0.0
        : (data.pendingOrders / data.orderCount).clamp(0.0, 1.0);
    final stock = data.productCount == 0
        ? 0.0
        : (data.lowStockCount / data.productCount).clamp(0.0, 1.0);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 20,
            offset: Offset(0, 7),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ClipPath(
                clipper: _HexagonClipper(),
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: const BoxDecoration(
                    gradient: AppColors.accentGradient,
                  ),
                  child: const Icon(
                    Icons.workspace_premium_rounded,
                    color: Colors.white,
                    size: 25,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // TODO: ligar o nome do administrador a dados reais.
                    Text(
                      'Administrador',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: _ink,
                      ),
                    ),
                    SizedBox(height: 3),
                    Text(
                      'Resumo da atividade',
                      style: TextStyle(fontSize: 10, color: _muted),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),
          const Text(
            'Tarefas da loja',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: _ink,
            ),
          ),
          const SizedBox(height: 16),
          _ProgressTaskTile(
            title: 'Encomendas pendentes',
            count: data.pendingOrders,
            progress: pending,
            icon: Icons.receipt_long_outlined,
          ),
          const SizedBox(height: 18),
          _ProgressTaskTile(
            title: 'Produtos com stock baixo',
            count: data.lowStockCount,
            progress: stock,
            icon: Icons.inventory_2_outlined,
          ),
        ],
      ),
    );
  }
}

class _HexagonClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) => Path()
    ..moveTo(size.width * .5, 0)
    ..lineTo(size.width, size.height * .25)
    ..lineTo(size.width, size.height * .75)
    ..lineTo(size.width * .5, size.height)
    ..lineTo(0, size.height * .75)
    ..lineTo(0, size.height * .25)
    ..close();
  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}

class _ProgressTaskTile extends StatelessWidget {
  const _ProgressTaskTile({
    required this.title,
    required this.count,
    required this.progress,
    required this.icon,
  });
  final String title;
  final int count;
  final double progress;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(
        children: [
          Icon(icon, size: 15, color: AppColors.accentEnd),
          const SizedBox(width: 7),
          Expanded(
            child: Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 10, color: _muted),
            ),
          ),
          Text(
            '$count',
            style: const TextStyle(
              fontSize: 11,
              color: _ink,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
      const SizedBox(height: 9),
      ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Container(
          height: 6,
          color: AppColors.background,
          alignment: Alignment.centerLeft,
          child: FractionallySizedBox(
            widthFactor: progress,
            child: const DecoratedBox(
              decoration: BoxDecoration(gradient: AppColors.accentGradient),
            ),
          ),
        ),
      ),
      const SizedBox(height: 5),
      Align(
        alignment: Alignment.centerRight,
        child: Text(
          '${(progress * 100).round()}%',
          style: const TextStyle(fontSize: 9, color: _muted),
        ),
      ),
    ],
  );
}

class _GradientBanner extends StatelessWidget {
  const _GradientBanner();
  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(18),
    child: Container(
      height: 158,
      width: double.infinity,
      decoration: const BoxDecoration(gradient: AppColors.bannerGradient),
      child: Stack(
        children: [
          Positioned(
            right: 35,
            top: -42,
            child: Container(
              width: 150,
              height: 150,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    Colors.white.withValues(alpha: .45),
                    Colors.white.withValues(alpha: .02),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            right: 105,
            bottom: -54,
            child: Container(
              width: 126,
              height: 126,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: .12),
              ),
            ),
          ),
          Positioned(
            right: 24,
            bottom: -28,
            child: Container(
              width: 105,
              height: 105,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.accentStart.withValues(alpha: .6),
                    AppColors.accentEnd.withValues(alpha: .1),
                  ],
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'A tua loja num só lugar',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 5),
                const Text(
                  'Acompanha encomendas, vendas e catálogo.',
                  style: TextStyle(color: Colors.white, fontSize: 10),
                ),
                const SizedBox(height: 14),
                FilledButton(
                  onPressed: () {},
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AppColors.accentEnd,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 15,
                      vertical: 8,
                    ),
                    visualDensity: VisualDensity.compact,
                  ),
                  child: const Text(
                    'Ver mais',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class _Panel extends StatelessWidget {
  const _Panel({
    required this.title,
    required this.trailing,
    required this.child,
  });
  final String title;
  final Widget trailing, child;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: Colors.white,
      border: Border.all(color: _line),
      borderRadius: BorderRadius.circular(13),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  color: _ink,
                  fontWeight: FontWeight.w600,
                  fontSize: 15,
                ),
              ),
            ),
            trailing,
          ],
        ),
        const SizedBox(height: 16),
        child,
      ],
    ),
  );
}

class _RevenueChart extends StatelessWidget {
  const _RevenueChart({required this.points});
  final List<RevenuePoint> points;
  @override
  Widget build(BuildContext context) {
    if (points.isEmpty)
      return const Center(
        child: Text(
          'Sem vendas neste período.',
          style: TextStyle(color: _muted),
        ),
      );
    return CustomPaint(
      painter: _BarChartPainter(points),
      child: const SizedBox.expand(),
    );
  }
}

class _BarChartPainter extends CustomPainter {
  _BarChartPainter(this.points);
  final List<RevenuePoint> points;
  @override
  void paint(Canvas canvas, Size size) {
    const left = 8.0, bottom = 24.0, top = 10.0;
    final chartHeight = size.height - bottom - top;
    final maxValue = points
        .map((e) => e.value)
        .fold<double>(0, (a, b) => a > b ? a : b);
    final count = points.length > 14 ? 14 : points.length;
    final visible = points.length > count
        ? points.sublist(points.length - count)
        : points;
    final width = size.width / (visible.length * 1.8);
    final gap = (size.width - width * visible.length) / (visible.length + 1);
    final gridPaint = Paint()
      ..color = _line
      ..strokeWidth = 1;
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
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(x, top + chartHeight - height, width, height),
        const Radius.circular(4),
      );
      canvas.drawRRect(rect, barPaint);
      if (visible.length <= 7 || i % 2 == 0 || i == visible.length - 1) {
        text.text = TextSpan(
          text: point.label,
          style: const TextStyle(color: _muted, fontSize: 10),
        );
        text.layout(maxWidth: width + gap);
        text.paint(
          canvas,
          Offset(x + width / 2 - text.width / 2, size.height - 18),
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant _BarChartPainter oldDelegate) =>
      oldDelegate.points != points;
}

class _OrderList extends StatelessWidget {
  const _OrderList({required this.orders});
  final List<AdminOrderSummary> orders;
  @override
  Widget build(BuildContext context) {
    if (orders.isEmpty)
      return const _EmptyPanel(message: 'Ainda não há pedidos para mostrar.');
    return Column(
      children: [
        if (MediaQuery.sizeOf(context).width > 650)
          const Padding(
            padding: EdgeInsets.only(bottom: 10),
            child: Row(
              children: [
                Expanded(flex: 2, child: _TableLabel('PEDIDO')),
                Expanded(flex: 3, child: _TableLabel('CLIENTE')),
                Expanded(flex: 2, child: _TableLabel('ESTADO')),
                Expanded(flex: 2, child: _TableLabel('TOTAL')),
              ],
            ),
          ),
        ...orders.map(
          (order) => Container(
            padding: const EdgeInsets.symmetric(vertical: 13),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: _line)),
            ),
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: Text(
                    '#${order.id}',
                    style: const TextStyle(
                      color: _ink,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Text(
                    order.customer,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: _muted),
                  ),
                ),
                Expanded(flex: 2, child: _StatusPill(order.status)),
                Expanded(
                  flex: 2,
                  child: Text(
                    _money(order.total),
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
        ),
      ],
    );
  }
}

class _StockList extends StatelessWidget {
  const _StockList({required this.products});
  final List<LowStockProduct> products;
  @override
  Widget build(BuildContext context) {
    if (products.isEmpty)
      return const _EmptyPanel(message: 'Não há produtos com stock baixo.');
    return Column(
      children: products
          .map(
            (product) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: AppColors.warningSurface,
                      borderRadius: BorderRadius.circular(9),
                    ),
                    child: const Icon(
                      Icons.inventory_2_outlined,
                      size: 17,
                      color: AppColors.warning,
                    ),
                  ),
                  const SizedBox(width: 11),
                  Expanded(
                    child: Text(
                      product.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, color: _ink),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    product.status == 'out_of_stock'
                        ? 'Esgotado'
                        : 'Últimas unidades',
                    style: const TextStyle(
                      color: AppColors.warning,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          )
          .toList(),
    );
  }
}

class _TableLabel extends StatelessWidget {
  const _TableLabel(this.label);
  final String label;
  @override
  Widget build(BuildContext context) => Text(
    label,
    style: const TextStyle(
      color: _muted,
      fontSize: 10,
      letterSpacing: .7,
      fontWeight: FontWeight.w700,
    ),
  );
}

class _StatusPill extends StatelessWidget {
  const _StatusPill(this.status);
  final String status;
  @override
  Widget build(BuildContext context) {
    final (label, bg, fg) = switch (status) {
      'pending' => ('Pendente', AppColors.warningSurface, AppColors.warning),
      'accepted' ||
      'preparing' => ('Em curso', AppColors.accentSurfaceBlue, _blue),
      'ready_for_pickup' => ('Pronto', AppColors.infoSurface, AppColors.info),
      'out_for_delivery' => (
        'Em entrega',
        AppColors.accentSurface,
        AppColors.accentEnd,
      ),
      'completed' => ('Concluído', AppColors.successSurface, AppColors.success),
      'rejected' => ('Rejeitado', AppColors.dangerSurface, AppColors.danger),
      _ => ('Cancelado', AppColors.dangerSurface, AppColors.danger),
    };
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: fg,
            fontSize: 10,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _EmptyPanel extends StatelessWidget {
  const _EmptyPanel({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Container(
    height: 90,
    alignment: Alignment.center,
    child: Text(message, style: const TextStyle(color: _muted, fontSize: 13)),
  );
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.message, required this.onRetry});
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
          const SizedBox(height: 14),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: _ink),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Tentar novamente'),
          ),
        ],
      ),
    ),
  );
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
