class User {
  const User({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.role = 'customer',
  });

  final int id;
  final String name;
  final String email;
  final String? phone;
  final String role;

  /// A API devolve: { id: 1, full_name: "...", phone: "...", email: "...", role: "customer" }
  /// (o id é um inteiro — SERIAL no PostgreSQL — e o nome vem em `full_name`).
  factory User.fromJson(Map<String, dynamic> json) {
    final rawId = json['id'];
    final fullName = json['full_name'] ?? json['fullName'];
    final firstName = json['first_name'] ?? json['firstName'];
    final lastName = json['last_name'] ?? json['lastName'];
    return User(
      id: rawId is num ? rawId.toInt() : int.tryParse('$rawId') ?? 0,
      name:
          fullName as String? ??
          [firstName, lastName]
              .whereType<String>()
              .where((part) => part.trim().isNotEmpty)
              .join(' '),
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String?,
      role: json['role'] as String? ?? 'customer',
    );
  }
}
