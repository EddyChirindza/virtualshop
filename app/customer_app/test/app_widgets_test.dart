import 'package:customer_app/theme/app_theme.dart';
import 'package:customer_app/widgets/app_widgets.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('shared storefront widgets fit a 360px viewport', (tester) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SafeArea(
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                AppPageHeader(
                  userName: 'Shopper',
                  title: 'VirtualShop',
                  isHome: true,
                  onMenu: _noop,
                ),
                const SizedBox(height: 20),
                AppSearchField(onFilter: _noop),
                const SizedBox(height: 18),
                SizedBox(
                  height: 40,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      CategoryChip(
                        label: 'Todos',
                        selected: true,
                        onPressed: _noop,
                      ),
                      const SizedBox(width: 8),
                      CategoryChip(label: 'Eletrónicos', onPressed: _noop),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                const PromoBanner(),
                const SizedBox(height: 24),
                SectionHeader(
                  title: 'Produtos populares',
                  actionLabel: 'Ver tudo',
                  onAction: _noop,
                ),
              ],
            ),
          ),
          bottomNavigationBar: FloatingBottomNav(
            selectedIndex: 0,
            cartItemCount: 2,
            onSelected: _selectTab,
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}

void _noop() {}

void _selectTab(int index) {}
