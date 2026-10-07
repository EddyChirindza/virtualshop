import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_text.dart';
import '../../../../core/errors/api_exception.dart';
import '../../../../core/widgets/error_retry.dart';
import '../../../auth/providers/auth_providers.dart';
import '../../../favorites/screens/favorites_screen.dart';
import '../../domain/models/profile.dart';
import '../providers/profile_providers.dart';
import '../widgets/profile_widgets.dart';
import 'address_form_screen.dart';
import 'addresses_screen.dart';
import 'edit_profile_sheet.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Future<void> _refresh(WidgetRef ref) async {
    await Future.wait([
      ref.read(profileProvider.notifier).refresh(),
      ref.read(profileStatsProvider.notifier).refresh(),
      ref.read(profileAddressesProvider.notifier).refresh(),
    ]);
  }

  void _showComingSoon(BuildContext context) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text(appText(context, 'Em breve', 'Coming soon'))),
      );
  }

  Future<void> _editProfile(BuildContext context, Profile profile) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => EditProfileSheet(profile: profile),
    );
  }

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(appText(context, 'Sair da conta?', 'Sign out?')),
        content: Text(
          appText(
            context,
            'Terás de iniciar sessão novamente para continuar.',
            'You will need to sign in again to continue.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(appText(context, 'Cancelar', 'Cancel')),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(context, true),
            child: Text(appText(context, 'Sair', 'Sign out')),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    try {
      await ref.read(authControllerProvider.notifier).logout();
    } on ApiException catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              appText(
                context,
                'Não foi possível terminar a sessão.',
                'Could not sign out.',
              ),
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) => SafeArea(
    child: RefreshIndicator(
      onRefresh: () => _refresh(ref),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 880),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(4, 0, 4, 12),
                    child: Text(
                      appText(context, 'Meu Perfil', 'My profile'),
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ),
                  _profileCard(context, ref),
                  const SizedBox(height: 14),
                  _statsCard(context, ref),
                  const SizedBox(height: 14),
                  _optionsCard(context, ref),
                  const SizedBox(height: 14),
                  _addressesCard(context, ref),
                  const SizedBox(height: 14),
                  _paymentCard(context),
                  const SizedBox(height: 20),
                  OutlinedButton.icon(
                    onPressed: () => _logout(context, ref),
                    icon: const Icon(Icons.logout),
                    label: const Text('Sair da conta'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Theme.of(context).colorScheme.error,
                      side: BorderSide(
                        color: Theme.of(context).colorScheme.error,
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
  );

  Widget _profileCard(BuildContext context, WidgetRef ref) => ref
      .watch(profileProvider)
      .when(
        loading: () => const Card(
          child: SizedBox(
            height: 128,
            child: Center(child: CircularProgressIndicator()),
          ),
        ),
        error: (error, _) => ErrorRetry(
          message: error is ApiException
              ? error.message
              : appText(
                  context,
                  'Não foi possível carregar o perfil.',
                  'Could not load profile.',
                ),
          onRetry: () => ref.read(profileProvider.notifier).refresh(),
        ),
        data: (profile) => ProfileCard(
          profile: profile,
          onTap: () => _editProfile(context, profile),
          onCameraTap: () {
            // TODO: ligar a seleção e o envio da fotografia de perfil.
            _showComingSoon(context);
          },
        ),
      );

  Widget _statsCard(BuildContext context, WidgetRef ref) => ref
      .watch(profileStatsProvider)
      .when(
        loading: () => const Card(
          child: SizedBox(
            height: 118,
            child: Center(child: CircularProgressIndicator()),
          ),
        ),
        error: (error, _) => ErrorRetry(
          message: error is ApiException
              ? error.message
              : appText(
                  context,
                  'Não foi possível carregar as estatísticas.',
                  'Could not load statistics.',
                ),
          onRetry: () => ref.read(profileStatsProvider.notifier).refresh(),
        ),
        data: (stats) => ProfileStatsCard(stats: stats),
      );

  Widget _optionsCard(BuildContext context, WidgetRef ref) => Card(
    margin: EdgeInsets.zero,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
          child: Text(
            appText(context, 'Opções da conta', 'Account options'),
            style: Theme.of(context).textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
        _OptionTile(
          icon: Icons.person_outline,
          title: appText(
            context,
            'Informações pessoais',
            'Personal information',
          ),
          subtitle: appText(
            context,
            'Nome, e-mail, telefone, data de nascimento',
            'Name, email, phone, date of birth',
          ),
          onTap: () {
            final profile = ref.read(profileProvider).valueOrNull;
            if (profile != null) _editProfile(context, profile);
          },
        ),
        _OptionTile(
          icon: Icons.shield_outlined,
          title: appText(context, 'Segurança da conta', 'Account security'),
          subtitle: appText(
            context,
            'Palavra-passe, autenticação, dispositivos',
            'Password, authentication, devices',
          ),
          onTap: () => _showComingSoon(context),
        ),
        _OptionTile(
          icon: Icons.notifications_none,
          title: appText(context, 'Notificações', 'Notifications'),
          subtitle: appText(
            context,
            'Pedidos, promoções, novidades',
            'Orders, promotions, updates',
          ),
          onTap: () => _showComingSoon(context),
        ),
        _OptionTile(
          icon: Icons.favorite_border,
          title: appText(context, 'Meus favoritos', 'My favorites'),
          subtitle: appText(
            context,
            'Produtos que guardaste',
            'Products you saved',
          ),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const FavoritesScreen()),
          ),
        ),
        const SizedBox(height: 4),
      ],
    ),
  );

  Widget _addressesCard(BuildContext context, WidgetRef ref) {
    final addresses = ref.watch(profileAddressesProvider);
    return ProfileSectionCard(
      title: appText(context, 'Endereços', 'Addresses'),
      actionLabel: appText(context, 'Gerenciar', 'Manage'),
      onAction: () => Navigator.of(
        context,
      ).push(MaterialPageRoute<void>(builder: (_) => const AddressesScreen())),
      child: addresses.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(24),
          child: Center(child: CircularProgressIndicator()),
        ),
        error: (error, _) => ErrorRetry(
          message: error is ApiException
              ? error.message
              : appText(
                  context,
                  'Não foi possível carregar os endereços.',
                  'Could not load addresses.',
                ),
          onRetry: () => ref.read(profileAddressesProvider.notifier).refresh(),
        ),
        data: (items) => Column(
          children: [
            if (items.isEmpty)
              Padding(
                padding: EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    appText(
                      context,
                      'Ainda não tens endereços. Adiciona o primeiro.',
                      'You have no addresses yet. Add your first one.',
                    ),
                  ),
                ),
              )
            else
              for (final address in items.take(2))
                AddressListTile(
                  address: address,
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => AddressFormScreen(address: address),
                    ),
                  ),
                ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
              child: OutlinedButton.icon(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const AddressFormScreen(),
                  ),
                ),
                icon: const Icon(Icons.add),
                label: Text(
                  appText(
                    context,
                    'Adicionar novo endereço',
                    'Add new address',
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(44),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _paymentCard(BuildContext context) => ProfileSectionCard(
    title: appText(context, 'Métodos de pagamento', 'Payment methods'),
    actionLabel: appText(context, 'Gerenciar', 'Manage'),
    onAction: () => _showComingSoon(context),
    child: Column(
      children: [
        // TODO: Substituir estes exemplos por métodos vindos da API de pagamentos.
        const _PaymentMethod(
          icon: Icons.phone_android,
          title: 'M-Pesa',
          detail: '•••• 7821',
          isDefault: true,
        ),
        const _PaymentMethod(
          icon: Icons.credit_card,
          title: 'Visa',
          detail: '•••• 4521',
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 2, 16, 14),
          child: OutlinedButton.icon(
            onPressed: () => _showComingSoon(context),
            icon: const Icon(Icons.add),
            label: Text(
              appText(
                context,
                'Adicionar método de pagamento',
                'Add payment method',
              ),
            ),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(44),
            ),
          ),
        ),
      ],
    ),
  );
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => ListTile(
    onTap: onTap,
    leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
    title: Text(title),
    subtitle: Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis),
    trailing: const Icon(Icons.chevron_right),
  );
}

class _PaymentMethod extends StatelessWidget {
  const _PaymentMethod({
    required this.icon,
    required this.title,
    required this.detail,
    this.isDefault = false,
  });

  final IconData icon;
  final String title;
  final String detail;
  final bool isDefault;

  @override
  Widget build(BuildContext context) => ListTile(
    leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
    title: Row(
      children: [
        Text(title),
        if (isDefault) ...[
          const SizedBox(width: 8),
          Chip(
            label: const Text('Padrão'),
            visualDensity: VisualDensity.compact,
            labelStyle: Theme.of(context).textTheme.labelSmall,
            padding: EdgeInsets.zero,
          ),
        ],
      ],
    ),
    subtitle: Text(detail),
  );
}
