import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../auth/providers/auth_providers.dart';
import '../../categories/providers/category_providers.dart';
import '../../categories/screens/category_products_screen.dart';
import '../../products/providers/product_providers.dart';
import '../../products/widgets/products_section.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key, required this.userName});

  final String userName;

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _selectedIndex = 0;

  Future<void> _refresh() async {
    ref.invalidate(categoryTreeProvider);
    ref.invalidate(popularProductsProvider);
    ref.invalidate(newArrivalsProvider);
    try {
      await Future.wait([
        ref.read(categoryTreeProvider.future),
        ref.read(popularProductsProvider.future),
        ref.read(newArrivalsProvider.future),
      ]);
    } catch (_) {
      // Cada secção apresenta o seu próprio estado de erro e retry.
    }
  }

  void _selectTab(int index) {
    setState(() => _selectedIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      _HomeTab(userName: widget.userName, onRefresh: _refresh),
      const _SearchTab(),
      const _CartTab(),
      _ProfileTab(
        userName: widget.userName,
        onLogout: () => ref.read(authControllerProvider.notifier).logout(),
      ),
    ];

    return Scaffold(
      body: IndexedStack(index: _selectedIndex, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: _selectTab,
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFFE5EFFA),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.search), label: 'Search'),
          NavigationDestination(icon: Icon(Icons.shopping_cart_outlined), selectedIcon: Icon(Icons.shopping_cart), label: 'Cart'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}

class _HomeTab extends ConsumerWidget {
  const _HomeTab({required this.userName, required this.onRefresh});

  final String userName;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            Row(
              children: [
                IconButton(icon: const Icon(Icons.menu), onPressed: () {}),
                Text('ShopSwift', style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: const Color(0xFF064B95), fontWeight: FontWeight.w800,
                )),
                const Spacer(),
                IconButton(icon: const Icon(Icons.notifications_none), onPressed: () {}),
              ],
            ),
            const SizedBox(height: 8),
            TextField(
              decoration: InputDecoration(
                hintText: 'Search premium tech & furniture',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(icon: const Icon(Icons.tune), onPressed: () {}),
                filled: true,
                fillColor: const Color(0xFFF3F1F2),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 20),
            _CategoriesRow(),
            const SizedBox(height: 18),
            _SaleBanner(),
            Padding(
              padding: const EdgeInsets.only(top: 28, bottom: 2),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Popular Products', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                  TextButton(onPressed: () {}, child: const Text('View All')),
                ],
              ),
            ),
            ProductsSection(
              title: '',
              products: ref.watch(popularProductsProvider),
              onRetry: () => ref.invalidate(popularProductsProvider),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 14, bottom: 2),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('New Arrivals', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                  TextButton(onPressed: () {}, child: const Text('Just In')),
                ],
              ),
            ),
            ProductsSection(
              title: '',
              products: ref.watch(newArrivalsProvider),
              onRetry: () => ref.invalidate(newArrivalsProvider),
            ),
          ],
        ),
      ),
    );
  }
}

class _SaleBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 150,
      padding: const EdgeInsets.fromLTRB(32, 22, 18, 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(colors: [Color(0xFF0B4B8E), Color(0xFFB6C4C9)], begin: Alignment.centerLeft, end: Alignment.centerRight),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4), decoration: BoxDecoration(color: Colors.orange, borderRadius: BorderRadius.circular(20)), child: const Text('Summer Sale', style: TextStyle(fontSize: 12))),
        const Spacer(),
        const Text('Summer\nElectronics Sale', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        const Text('Up to 45% Off Premium Brands', style: TextStyle(color: Colors.white70)),
      ]),
    );
  }
}

class _SearchTab extends StatelessWidget {
  const _SearchTab();

  @override
  Widget build(BuildContext context) => const _PlaceholderTab(icon: Icons.search, title: 'Search', message: 'Find your next favorite product.');
}

class _CartTab extends StatelessWidget {
  const _CartTab();

  @override
  Widget build(BuildContext context) => const _PlaceholderTab(icon: Icons.shopping_cart_outlined, title: 'Your Cart', message: 'Your cart is waiting for something special.');
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab({required this.userName, required this.onLogout});

  final String userName;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SizedBox(height: 32),
            const CircleAvatar(radius: 34, child: Icon(Icons.person, size: 36)),
            const SizedBox(height: 16),
            Text(userName, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 28),
            ListTile(leading: const Icon(Icons.logout), title: const Text('Terminar sessão'), onTap: onLogout),
          ]),
        ),
      );
}

class _PlaceholderTab extends StatelessWidget {
  const _PlaceholderTab({required this.icon, required this.title, required this.message});

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) => SafeArea(
        child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: 56, color: const Color(0xFF064B95)),
          const SizedBox(height: 16),
          Text(title, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(message),
        ])),
      );
}

class _CategoriesRow extends ConsumerWidget {
  const _CategoriesRow();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categories = ref.watch(categoryTreeProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Text('Categorias', style: Theme.of(context).textTheme.titleLarge),
        ),
        SizedBox(
          height: 48,
          child: categories.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => Center(
              child: TextButton.icon(
                onPressed: () => ref.invalidate(categoryTreeProvider),
                icon: const Icon(Icons.refresh),
                label: Text(
                  error is ApiException
                      ? '${error.message} Toca para tentar de novo.'
                      : 'Erro ao carregar categorias. Toca para tentar de novo.',
                ),
              ),
            ),
            data: (items) => ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: items.length,
              separatorBuilder: (context, index) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final category = items[index];
                return ActionChip(
                  label: Text(category.name),
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => CategoryProductsScreen(category: category),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}
