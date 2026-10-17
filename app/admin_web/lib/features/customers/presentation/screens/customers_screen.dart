import 'package:flutter/material.dart';

import '../../data/customers_repository.dart';
import '../../models/admin_customer.dart';

const _ink = Color(0xFF182230);
const _muted = Color(0xFF667085);
const _line = Color(0xFFEAECF0);
const _blue = Color(0xFF3157D5);

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key, required this.repository});
  final CustomersRepository repository;

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  late Future<List<AdminCustomer>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.repository.load();
  }

  Future<void> _reload() async {
    final future = widget.repository.load();
    setState(() => _future = future);
    await future;
  }

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Clientes', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: _ink)),
          const SizedBox(height: 5),
          const Text('Consulta os dados pessoais básicos das contas registadas.', style: TextStyle(color: _muted, fontSize: 14)),
          const SizedBox(height: 24),
          Expanded(
            child: FutureBuilder<List<AdminCustomer>>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.cloud_off_outlined, color: _muted, size: 40),
                    const SizedBox(height: 12),
                    Text(_errorMessage(snapshot.error!), textAlign: TextAlign.center, style: const TextStyle(color: _ink)),
                    const SizedBox(height: 14),
                    OutlinedButton.icon(onPressed: _reload, icon: const Icon(Icons.refresh), label: const Text('Tentar novamente')),
                  ]));
                }
                final customers = snapshot.data ?? const <AdminCustomer>[];
                if (customers.isEmpty) return const Center(child: Text('Ainda não há clientes registados.', style: TextStyle(color: _muted)));
                return RefreshIndicator(
                  onRefresh: _reload,
                  child: ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    itemCount: customers.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) => _CustomerTile(
                      customer: customers[index],
                      onTap: () => _showDetails(context, customers[index]),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      );

  void _showDetails(BuildContext context, AdminCustomer customer) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Dados do cliente'),
        content: SizedBox(
          width: 420,
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            _DetailRow(label: 'ID', value: _display(customer.id)),
            _DetailRow(label: 'Nome', value: customer.name),
            _DetailRow(label: 'Email', value: _display(customer.email)),
            _DetailRow(label: 'Telefone', value: _display(customer.phone)),
            _DetailRow(label: 'Registado em', value: _date(customer.createdAt)),
          ]),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Fechar'))],
      ),
    );
  }

  String _errorMessage(Object error) {
    final text = error.toString();
    if (text.contains('404')) return 'O endpoint administrativo de clientes ainda não está disponível na API.';
    if (text.contains('401') || text.contains('403')) return 'Sem autorização para consultar clientes. Entra novamente como administrador.';
    if (text.contains('SocketException') || text.contains('connection')) return 'Não foi possível ligar à API.';
    return 'Não foi possível carregar os clientes. Confirma a API e tenta novamente.';
  }
}

class _CustomerTile extends StatelessWidget {
  const _CustomerTile({required this.customer, required this.onTap});
  final AdminCustomer customer;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(border: Border.all(color: _line), borderRadius: BorderRadius.circular(12)),
            child: Row(children: [
              CircleAvatar(backgroundColor: const Color(0xFFE8EDFF), child: Text(customer.name.isEmpty ? '?' : customer.name[0].toUpperCase(), style: const TextStyle(color: _blue, fontWeight: FontWeight.w700))),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(customer.name, style: const TextStyle(color: _ink, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text(customer.email.isEmpty ? customer.phone : customer.email, style: const TextStyle(color: _muted, fontSize: 13), overflow: TextOverflow.ellipsis),
              ])),
              const SizedBox(width: 10),
              const Icon(Icons.chevron_right, color: _muted),
            ]),
          ),
        ),
      );
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 9), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [SizedBox(width: 110, child: Text(label, style: const TextStyle(color: _muted))), Expanded(child: SelectableText(value, style: const TextStyle(color: _ink, fontWeight: FontWeight.w500)))]));
}

String _display(String value) => value.isEmpty ? 'Não informado' : value;
String _date(DateTime? value) {
  if (value == null) return 'Não informado';
  final local = value.toLocal();
  return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year}';
}
