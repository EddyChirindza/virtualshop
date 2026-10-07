class ProfileAddress {
  const ProfileAddress({
    required this.id,
    required this.label,
    required this.province,
    required this.city,
    required this.neighborhood,
    required this.street,
    required this.number,
    this.reference,
    this.isDefault = false,
  });

  final int id;
  final String label;
  final String province;
  final String city;
  final String neighborhood;
  final String street;
  final String number;
  final String? reference;
  final bool isDefault;

  String get summary => [
    neighborhood,
    street,
    number,
    city,
    'Moçambique',
  ].where((part) => part.trim().isNotEmpty).join(', ');

  factory ProfileAddress.fromJson(Map<String, dynamic> json) => ProfileAddress(
    id: _asInt(json['id']),
    label: (json['label'] ?? json['name']) as String? ?? '',
    province: (json['province'] ?? '') as String,
    city: (json['city'] ?? '') as String,
    neighborhood: (json['neighborhood'] ?? json['bairro'] ?? '') as String,
    street: (json['street'] ?? json['avenue'] ?? json['avenida'] ?? '') as String,
    number: '${json['number'] ?? json['house_number'] ?? ''}',
    reference: json['reference'] as String?,
    isDefault: json['is_default'] as bool? ?? json['isDefault'] as bool? ?? false,
  );

  static int _asInt(Object? value) =>
      value is num ? value.toInt() : int.tryParse('$value') ?? 0;
}