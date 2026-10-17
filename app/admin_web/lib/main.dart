import 'package:flutter/material.dart';

import 'features/auth/presentation/screens/admin_login_screen.dart';
import 'features/catalog/data/catalog_repository.dart';
import 'features/customers/data/customers_repository.dart';
import 'features/dashboard/data/dashboard_repository.dart';
import 'features/dashboard/presentation/screens/dashboard_screen.dart';

void main() => runApp(const VirtualShopAdminApp());

class VirtualShopAdminApp extends StatefulWidget {
  const VirtualShopAdminApp({super.key});

  @override
  State<VirtualShopAdminApp> createState() => _VirtualShopAdminAppState();
}

class _VirtualShopAdminAppState extends State<VirtualShopAdminApp> {
  String? _token;

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
        home: _token == null
            ? AdminLoginScreen(onAuthenticated: (token) {
                setState(() => _token = token);
              })
            : DashboardScreen(
                repository: DashboardRepository(token: _token!),
                catalogRepository: CatalogRepository(token: _token!),
                customersRepository: CustomersRepository(token: _token!),
                onLogout: () => setState(() => _token = null),
              ),
      );
}
