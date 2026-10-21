import 'package:flutter/material.dart';

import '../../data/admin_notifications_repository.dart';

const _ink = Color(0xFF182230);
const _muted = Color(0xFF667085);
const _line = Color(0xFFEAECF0);

class AdminNotificationsScreen extends StatefulWidget {
  const AdminNotificationsScreen({super.key, required this.repository});
  final AdminNotificationsRepository repository;

  @override
  State<AdminNotificationsScreen> createState() =>
      _AdminNotificationsScreenState();
}

class _AdminNotificationsScreenState extends State<AdminNotificationsScreen> {
  late Future<List<AdminNotification>> _future;
  var _saving = false;

  @override
  void initState() {
    super.initState();
    _future = widget.repository.list();
  }

  void _reload() => setState(() => _future = widget.repository.list());

  Future<void> _create() async {
    final result = await showDialog<_NotificationDraft>(
      context: context,
      builder: (_) => const _NotificationForm(),
    );
    if (result == null) return;
    setState(() => _saving = true);
    try {
      await widget.repository.create(
        title: result.title,
        message: result.message,
        type: result.type,
        status: result.published ? 'published' : 'draft',
        productId: result.productId,
        expiresAt: result.expiresAt,
      );
      _reload();
      _notice('Notificação criada.');
    } catch (error) {
      _notice('Não foi possível criar a notificação: $error', error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _archive(AdminNotification notification) async {
    try {
      await widget.repository.archive(notification.id);
      _reload();
      _notice('Notificação arquivada.');
    } catch (error) {
      _notice('Não foi possível arquivar: $error', error: true);
    }
  }

  void _notice(String message, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: error ? const Color(0xFFB42318) : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(
        children: [
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Notificações',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: _ink,
                  ),
                ),
                SizedBox(height: 5),
                Text(
                  'Publicar avisos internos para os clientes.',
                  style: TextStyle(color: _muted, fontSize: 14),
                ),
              ],
            ),
          ),
          OutlinedButton.icon(
            onPressed: _reload,
            icon: const Icon(Icons.refresh),
            label: const Text('Atualizar'),
          ),
          const SizedBox(width: 8),
          FilledButton.icon(
            onPressed: _saving ? null : _create,
            icon: const Icon(Icons.add),
            label: const Text('Nova notificação'),
          ),
        ],
      ),
      const SizedBox(height: 20),
      Expanded(
        child: FutureBuilder<List<AdminNotification>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting &&
                !snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Não foi possível carregar notificações: ${snapshot.error}',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: _reload,
                      child: const Text('Tentar novamente'),
                    ),
                  ],
                ),
              );
            }
            final items = snapshot.data ?? const [];
            if (items.isEmpty) {
              return const Center(
                child: Text('Ainda não existem notificações.'),
              );
            }
            return ListView.separated(
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final item = items[index];
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: _line),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.notifications_none_rounded,
                        color: Color(0xFF3157D5),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.title,
                              style: const TextStyle(
                                color: _ink,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              item.message,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: _muted),
                            ),
                            const SizedBox(height: 5),
                            Text(
                              '${item.type} · ${item.status}',
                              style: const TextStyle(
                                color: _muted,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (item.status != 'archived')
                        IconButton(
                          tooltip: 'Arquivar',
                          onPressed: () => _archive(item),
                          icon: const Icon(Icons.archive_outlined),
                        ),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    ],
  );
}

class _NotificationDraft {
  const _NotificationDraft({
    required this.title,
    required this.message,
    required this.type,
    required this.published,
    this.productId,
    this.expiresAt,
  });
  final String title;
  final String message;
  final String type;
  final bool published;
  final int? productId;
  final DateTime? expiresAt;
}

class _NotificationForm extends StatefulWidget {
  const _NotificationForm();
  @override
  State<_NotificationForm> createState() => _NotificationFormState();
}

class _NotificationFormState extends State<_NotificationForm> {
  final _form = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _message = TextEditingController();
  final _productId = TextEditingController();
  var _type = 'general';
  var _published = true;
  DateTime? _expiresAt;

  Future<void> _chooseExpiry() async {
    final today = DateUtils.dateOnly(DateTime.now());
    final selected = await showDatePicker(
      context: context,
      initialDate: _expiresAt ?? today.add(const Duration(days: 7)),
      firstDate: today,
      lastDate: today.add(const Duration(days: 3650)),
    );
    if (selected != null) {
      setState(
        () => _expiresAt = DateTime(
          selected.year,
          selected.month,
          selected.day,
          23,
          59,
          59,
        ),
      );
    }
  }

  @override
  void dispose() {
    _title.dispose();
    _message.dispose();
    _productId.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Nova notificação'),
    content: SizedBox(
      width: 480,
      child: Form(
        key: _form,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _title,
                maxLength: 100,
                decoration: const InputDecoration(labelText: 'Título'),
                validator: (value) => value == null || value.trim().isEmpty
                    ? 'O título é obrigatório.'
                    : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _message,
                maxLength: 500,
                maxLines: 4,
                decoration: const InputDecoration(labelText: 'Mensagem'),
                validator: (value) => value == null || value.trim().isEmpty
                    ? 'A mensagem é obrigatória.'
                    : null,
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: _type,
                decoration: const InputDecoration(labelText: 'Tipo'),
                items: const [
                  DropdownMenuItem(
                    value: 'general',
                    child: Text('Informação geral'),
                  ),
                  DropdownMenuItem(
                    value: 'new_product',
                    child: Text('Novo produto'),
                  ),
                  DropdownMenuItem(value: 'promotion', child: Text('Promoção')),
                  DropdownMenuItem(value: 'discount', child: Text('Desconto')),
                  DropdownMenuItem(
                    value: 'product_alert',
                    child: Text('Alerta de produto'),
                  ),
                ],
                onChanged: (value) {
                  if (value != null) setState(() => _type = value);
                },
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _productId,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'ID do produto associado (opcional)',
                ),
                validator: (value) =>
                    value != null &&
                        value.trim().isNotEmpty &&
                        int.tryParse(value.trim()) == null
                    ? 'Introduz um ID numérico.'
                    : null,
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: Wrap(
                  spacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    OutlinedButton.icon(
                      onPressed: _chooseExpiry,
                      icon: const Icon(Icons.event_outlined),
                      label: Text(
                        _expiresAt == null
                            ? 'Definir validade (opcional)'
                            : 'Válida até ${_expiresAt!.day.toString().padLeft(2, '0')}/${_expiresAt!.month.toString().padLeft(2, '0')}/${_expiresAt!.year}',
                      ),
                    ),
                    if (_expiresAt != null)
                      IconButton(
                        tooltip: 'Remover validade',
                        onPressed: () => setState(() => _expiresAt = null),
                        icon: const Icon(Icons.close),
                      ),
                  ],
                ),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: _published,
                onChanged: (value) => setState(() => _published = value),
                title: const Text('Publicar agora'),
              ),
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Destinatários: todos os clientes',
                  style: TextStyle(color: _muted, fontSize: 12),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancelar'),
      ),
      FilledButton(
        onPressed: () {
          if (!_form.currentState!.validate()) return;
          Navigator.pop(
            context,
            _NotificationDraft(
              title: _title.text.trim(),
              message: _message.text.trim(),
              type: _type,
              published: _published,
              productId: int.tryParse(_productId.text.trim()),
              expiresAt: _expiresAt,
            ),
          );
        },
        child: const Text('Guardar'),
      ),
    ],
  );
}
