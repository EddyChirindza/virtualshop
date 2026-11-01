import 'package:flutter/material.dart';

import 'core/auth/admin_session.dart';
import 'core/network/admin_api.dart';
import 'features/auth/data/admin_auth_repository.dart';
import 'features/auth/presentation/screens/admin_login_screen.dart';
import 'features/catalog/data/catalog_repository.dart';
import 'features/customers/data/customers_repository.dart';
import 'features/dashboard/data/dashboard_repository.dart';
import 'features/dashboard/presentation/screens/dashboard_screen.dart';
import 'features/notifications/data/admin_notifications_repository.dart';
import 'features/orders/data/orders_repository.dart';

void main() => runApp(const VirtualShopAdminApp());

class VirtualShopAdminApp extends StatefulWidget {
  const VirtualShopAdminApp({super.key});

  @override
  State<VirtualShopAdminApp> createState() => _VirtualShopAdminAppState();
}

class _VirtualShopAdminAppState extends State<VirtualShopAdminApp> {
  late final AdminSession _session;
  late final AdminApi _api;
  late final AdminAuthRepository _authRepository;
  late final DashboardRepository _dashboardRepository;
  late final CatalogRepository _catalogRepository;
  late final CustomersRepository _customersRepository;
  late final AdminNotificationsRepository _notificationsRepository;
  late final OrdersRepository _ordersRepository;

  bool _authenticated = false;
  String? _loginError;

  @override
  void initState() {
    super.initState();
    _session = AdminSession(onExpired: _handleSessionExpired);
    _api = AdminApi(session: _session);
    _authRepository = AdminAuthRepository(api: _api);
    _dashboardRepository = DashboardRepository(api: _api);
    _catalogRepository = CatalogRepository(api: _api);
    _customersRepository = CustomersRepository(api: _api);
    _notificationsRepository = AdminNotificationsRepository(api: _api);
    _ordersRepository = OrdersRepository(api: _api);
  }

  void _handleSessionExpired() {
    if (!mounted) return;
    setState(() {
      _authenticated = false;
      _loginError = 'A sessão expirou. Entra novamente.';
    });
  }

  void _handleAuthenticated(AdminTokens tokens) {
    _session.start(tokens);
    setState(() {
      _authenticated = true;
      _loginError = null;
    });
  }

  Future<void> _logout() async {
    if (mounted) {
      setState(() {
        _authenticated = false;
        _loginError = null;
      });
    }
    await _session.logout();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'VirtualShop Admin',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF3157D5),
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: const Color(0xFFF5F7FB),
      fontFamily: 'Roboto',
    ),
    home: _authenticated
        ? DashboardScreen(
            repository: _dashboardRepository,
            catalogRepository: _catalogRepository,
            customersRepository: _customersRepository,
            notificationsRepository: _notificationsRepository,
            ordersRepository: _ordersRepository,
            onLogout: _logout,
          )
        : AdminLoginScreen(
            repository: _authRepository,
            initialError: _loginError,
            onAuthenticated: _handleAuthenticated,
          ),
  );
}
