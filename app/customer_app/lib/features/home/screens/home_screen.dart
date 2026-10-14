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
import '../../../theme/app_theme.dart';
import '../../../widgets/app_widgets.dart';
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
    final titles = [
      appText(context, 'ShopSwift', 'ShopSwift'),
      appText(context, 'Pesquisar', 'Search'),
      appText(context, 'Carrinho', 'Cart'),
      appText(context, 'Perfil', 'Profile'),
    ];
    final pages = [
      _HomeTab(userName: widget.userName, onRefresh: _refresh),
      SearchScreen(
        key: ValueKey(_searchScreenKey),
        isActive: _selectedIndex == 1,
      ),
      const CartScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      drawer: _AppDrawer(userName: widget.userName, onSelected: _openMenuPage),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
              child: Builder(
                builder: (context) => AppPageHeader(
                  userName: widget.userName,
                  title: titles[_selectedIndex],
                  isHome: _selectedIndex == 0,
                  onMenu: () => Scaffold.of(context).openDrawer(),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: IndexedStack(index: _selectedIndex, children: pages),
            ),
          ],
        ),
      ),
      bottomNavigationBar: FloatingBottomNav(
        selectedIndex: _selectedIndex,
        cartItemCount: cartItemCount,
        onSelected: _selectTab,
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
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 104),
          children: [
            AppSearchField(
              hintText: appText(
                context,
                'Pesquisar produtos',
                'Search products',
              ),
              onFilter: () {
                ref.read(homeTabRequestProvider.notifier).state = 1;
              },
            ),
            const SizedBox(height: 18),
            _CategoriesRow(),
            const SizedBox(height: 20),
            const PromoBanner(),
            const SizedBox(height: 24),
            SectionHeader(
              title: appText(context, 'Produtos populares', 'Popular products'),
              actionLabel: appText(context, 'Ver tudo', 'View all'),
              onAction: () {},
            ),
            const SizedBox(height: 4),
            ProductsSection(
              title: '',
              products: ref.watch(popularProductsProvider),
              onRetry: () => ref.invalidate(popularProductsProvider),
            ),
            const SizedBox(height: 24),
            SectionHeader(
              title: appText(context, 'Novidades', 'New arrivals'),
              actionLabel: appText(context, 'Ver novidades', 'Just in'),
              onAction: () {},
            ),
            const SizedBox(height: 4),
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
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  gradient: const LinearGradient(
                    colors: [AppColors.brand, AppColors.brandLight],
                    begin: Alignment.bottomLeft,
                    end: Alignment.topRight,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'ShopSwift',
                      style: Theme.of(context).textTheme.titleLarge
                          ?.copyWith(color: AppColors.surface, fontSize: 22),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        const CircleAvatar(
                          radius: 24,
                          backgroundColor: AppColors.surface,
                          child: Icon(
                            Icons.person_rounded,
                            color: AppColors.brand,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            userName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(color: AppColors.surface),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: [
                  for (final option in _MenuOption.values)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: SizedBox(
                        height: 52,
                        child: Material(
                          color: Colors.transparent,
                          borderRadius: BorderRadius.circular(AppRadius.field),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(
                              AppRadius.field,
                            ),
                            onTap: () {
                              Navigator.of(context).pop();
                              onSelected(option);
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                              ),
                              child: Row(
                                children: [
                                  Icon(option.icon, color: AppColors.ink),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Text(
                                      appText(
                                        context,
                                        option.title,
                                        option.englishTitle,
                                      ),
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleSmall
                                          ?.copyWith(
                                            color: AppColors.ink,
                                            fontWeight: FontWeight.w600,
                                          ),
                                    ),
                                  ),
                                  const Icon(
                                    Icons.chevron_right,
                                    color: AppColors.secondaryText,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
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

class _CategoriesRow extends ConsumerWidget {
  const _CategoriesRow();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categories = ref.watch(categoryTreeProvider);

    return SizedBox(
      height: 40,
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
          itemCount: items.length + 1,
          separatorBuilder: (context, index) => const SizedBox(width: 8),
          itemBuilder: (context, index) {
            if (index == 0) {
              return CategoryChip(
                label: appText(context, 'Todos', 'All'),
                selected: true,
                onPressed: () {},
              );
            }
            final category = items[index - 1];
            return CategoryChip(
              label: category.name,
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => CategoryProductsScreen(category: category),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
