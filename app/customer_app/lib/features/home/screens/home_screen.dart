import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/app_text.dart';
import '../../../core/app_navigation.dart';
import '../../../core/errors/api_exception.dart';
import '../../categories/providers/category_providers.dart';
import '../../categories/screens/category_products_screen.dart';
import '../../cart/providers/cart_provider.dart';
import '../../cart/screens/cart_screen.dart';
import '../../products/providers/product_providers.dart';
import '../../products/widgets/products_section.dart';
import '../../profile/presentation/screens/profile_screen.dart';
import '../../search/presentation/providers/search_providers.dart';
import '../../search/presentation/screens/search_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key, required this.userName});

  final String userName;

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _selectedIndex = 0;
  int _searchScreenKey = 0;

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
    final shouldResetSearch =
        index == 1 &&
        ref.read(searchControllerProvider).filters.categoryId != null;
    if (shouldResetSearch) {
      ref.read(searchControllerProvider.notifier).reset();
    }
    setState(() {
      _selectedIndex = index;
      if (shouldResetSearch) _searchScreenKey++;
    });
  }

  void _openMenuPage(_MenuOption option) {
    if (option == _MenuOption.settings) {
      Navigator.of(
        context,
      ).push(MaterialPageRoute<void>(builder: (_) => const SettingsScreen()));
      return;
    }
    Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => _MenuPage(option: option)));
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<int?>(homeTabRequestProvider, (previous, next) {
      if (next == null) return;
      _selectTab(next);
      ref.read(homeTabRequestProvider.notifier).state = null;
    });

    final cartItemCount = ref.watch(
      cartControllerProvider.select((cart) => cart.itemCount),
    );
    final pages = [
      _HomeTab(userName: widget.userName, onRefresh: _refresh),
      SearchScreen(key: ValueKey(_searchScreenKey)),
      const CartScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      drawer: _AppDrawer(userName: widget.userName, onSelected: _openMenuPage),
      body: IndexedStack(index: _selectedIndex, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: _selectTab,
        backgroundColor: Theme.of(context).colorScheme.surface,
        indicatorColor: Theme.of(context).colorScheme.secondaryContainer,
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.home_outlined),
            selectedIcon: const Icon(Icons.home),
            label: appText(context, 'Início', 'Home'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.search),
            label: appText(context, 'Pesquisa', 'Search'),
          ),
          NavigationDestination(
            icon: _CartNavIcon(count: cartItemCount),
            selectedIcon: _CartNavIcon(count: cartItemCount, selected: true),
            label: appText(context, 'Carrinho', 'Cart'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.person_outline),
            selectedIcon: const Icon(Icons.person),
            label: appText(context, 'Perfil', 'Profile'),
          ),
        ],
      ),
    );
  }
}

class _CartNavIcon extends StatelessWidget {
  const _CartNavIcon({required this.count, this.selected = false});

  final int count;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final icon = Icon(
      selected ? Icons.shopping_cart : Icons.shopping_cart_outlined,
      size: 24,
    );
    if (count <= 0) return icon;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        icon,
        Positioned(
          right: -6,
          top: -4,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
            decoration: BoxDecoration(
              color: const Color(0xFF064B95),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              count > 99 ? '99+' : '$count',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
      ],
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
                Builder(
                  builder: (context) => IconButton(
                    tooltip: appText(context, 'Abrir menu', 'Open menu'),
                    icon: const Icon(Icons.menu),
                    onPressed: () => Scaffold.of(context).openDrawer(),
                  ),
                ),
                Text(
                  'ShopSwift',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: const Color(0xFF064B95),
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.notifications_none),
                  onPressed: () {},
                ),
              ],
            ),
            const SizedBox(height: 8),
            TextField(
              decoration: InputDecoration(
                hintText: appText(
                  context,
                  'Pesquisar tecnologia e móveis',
                  'Search tech and furniture',
                ),
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: Theme.of(context)
                    .colorScheme
                    .surfaceContainerHighest,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
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
                  Text(
                    appText(context, 'Produtos populares', 'Popular products'),
                    style: Theme.of(context).textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  TextButton(
                    onPressed: () {},
                    child: Text(appText(context, 'Ver todos', 'View all')),
                  ),
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
                  Text(
                    appText(context, 'Novidades', 'New arrivals'),
                    style: Theme.of(context).textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  TextButton(
                    onPressed: () {},
                    child: Text(appText(context, 'Ver novidades', 'Just in')),
                  ),
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

enum _MenuOption {
  chat('Atendimento', 'Support', Icons.chat_bubble_outline),
  settings('Definições', 'Settings', Icons.settings_outlined),
  about('Sobre nós', 'About us', Icons.info_outline),
  terms(
    'Termos e condições',
    'Terms and conditions',
    Icons.description_outlined,
  );

  const _MenuOption(this.title, this.englishTitle, this.icon);

  final String title;
  final String englishTitle;
  final IconData icon;
}

class _AppDrawer extends StatelessWidget {
  const _AppDrawer({required this.userName, required this.onSelected});

  final String userName;
  final ValueChanged<_MenuOption> onSelected;

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: SafeArea(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: const BoxDecoration(color: Color(0xFF064B95)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  const CircleAvatar(
                    backgroundColor: Colors.white,
                    child: Icon(Icons.person, color: Color(0xFF064B95)),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    appText(context, 'Olá, $userName', 'Hello, $userName'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Text(
                    'ShopSwift',
                    style: TextStyle(color: Colors.white70),
                  ),
                ],
              ),
            ),
            for (final option in _MenuOption.values)
              ListTile(
                leading: Icon(option.icon),
                title: Text(
                  appText(context, option.title, option.englishTitle),
                ),
                trailing: const Icon(Icons.chevron_right, size: 20),
                onTap: () {
                  Navigator.of(context).pop();
                  onSelected(option);
                },
              ),
          ],
        ),
      ),
    );
  }
}

class _MenuPage extends StatelessWidget {
  const _MenuPage({required this.option});

  final _MenuOption option;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(appText(context, option.title, option.englishTitle)),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(option.icon, size: 64, color: const Color(0xFF064B95)),
              const SizedBox(height: 20),
              Text(
                appText(context, option.title, option.englishTitle),
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(
                _menuDescription(context, option),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _menuDescription(BuildContext context, _MenuOption option) {
    switch (option) {
      case _MenuOption.chat:
        return appText(
          context,
          'Fala connosco e tira as tuas dúvidas.',
          'Contact us if you have any questions.',
        );
      case _MenuOption.settings:
        return appText(
          context,
          'Personaliza as definições da tua conta.',
          'Customize your account settings.',
        );
      case _MenuOption.about:
        return appText(
          context,
          'Conhece melhor a ShopSwift.',
          'Learn more about ShopSwift.',
        );
      case _MenuOption.terms:
        return appText(
          context,
          'Consulta os termos e condições da aplicação.',
          'Review the app terms and conditions.',
        );
    }
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
        gradient: const LinearGradient(
          colors: [Color(0xFF0B4B8E), Color(0xFFB6C4C9)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.orange,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              appText(context, 'Promoção de verão', 'Summer sale'),
              style: const TextStyle(fontSize: 12),
            ),
          ),
          const Spacer(),
          Text(
            appText(
              context,
              'Descontos de verão\nem eletrónicos',
              'Summer electronics\nsale',
            ),
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            appText(context, 'Até 45% de desconto', 'Up to 45% off'),
            style: TextStyle(color: Colors.white70),
          ),
        ],
      ),
    );
  }
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
          child: Text(
            'Categorias',
            style: Theme.of(context).textTheme.titleLarge,
          ),
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
                      : appText(
                          context,
                          'Erro ao carregar categorias. Toca para tentar de novo.',
                          'Could not load categories. Tap to try again.',
                        ),
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
                      builder: (_) =>
                          CategoryProductsScreen(category: category),
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
