import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_text.dart';
import '../../../../core/errors/api_exception.dart';
import '../../../../core/widgets/error_retry.dart';
import '../providers/profile_providers.dart';
import '../widgets/profile_widgets.dart';
import 'address_form_screen.dart';

class AddressesScreen extends ConsumerWidget {
  const AddressesScreen({super.key});

  Future<void> _openAddress(
    BuildContext context,
    WidgetRef ref, {
    int? index,
  }) async {
    final addresses =
        ref.read(profileAddressesProvider).valueOrNull ?? const [];
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) =>
            AddressFormScreen(address: index == null ? null : addresses[index]),
      ),
    );
    if (changed == true && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            appText(context, 'Endereços atualizados.', 'Addresses updated.'),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final addresses = ref.watch(profileAddressesProvider);
    return Scaffold(
      appBar: AppBar(title: Text(appText(context, 'Endereços', 'Addresses'))),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: addresses.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => ErrorRetry(
              message: error is ApiException
                  ? error.message
                  : appText(
                      context,
                      'Não foi possível carregar os endereços.',
                      'Could not load addresses.',
                    ),
              onRetry: () =>
                  ref.read(profileAddressesProvider.notifier).refresh(),
            ),
            data: (items) => RefreshIndicator(
              onRefresh: () =>
                  ref.read(profileAddressesProvider.notifier).refresh(),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  if (items.isEmpty)
                    Padding(
                      padding: EdgeInsets.symmetric(
                        vertical: 40,
                        horizontal: 16,
                      ),
                      child: Text(
                        appText(
                          context,
                          'Ainda não tens endereços. Adiciona o primeiro.',
                          'You have no addresses yet. Add your first one.',
                        ),
                        textAlign: TextAlign.center,
                      ),
                    )
                  else
                    for (var index = 0; index < items.length; index++) ...[
                      Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        clipBehavior: Clip.antiAlias,
                        child: AddressListTile(
                          address: items[index],
                          onTap: () => _openAddress(context, ref, index: index),
                        ),
                      ),
                    ],
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () => _openAddress(context, ref),
                    icon: const Icon(Icons.add),
                    label: Text(
                      appText(
                        context,
                        'Adicionar novo endereço',
                        'Add new address',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
