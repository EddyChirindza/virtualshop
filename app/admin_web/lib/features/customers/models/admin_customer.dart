class AdminCustomer {
  const AdminCustomer({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.createdAt,
  });

  final String id;
  final String name;
  final String email;
  final String phone;
  final DateTime? createdAt;

  factory AdminCustomer.fromJson(Map<String, dynamic> json) => AdminCustomer(
        id: (json['id'] ?? '').toString(),
        name: (json['fullName'] ?? json['full_name'] ?? json['name'] ?? 'Sem nome').toString(),
        email: (json['email'] ?? '').toString(),
        phone: (json['phone'] ?? '').toString(),
        createdAt: DateTime.tryParse(
          (json['created_at'] ?? json['createdAt'] ?? '').toString(),
        ),
      );
}
