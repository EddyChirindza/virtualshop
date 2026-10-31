enum PaymentMethodType {
  mpesa('mpesa'),
  visa('visa');

  const PaymentMethodType(this.apiValue);

  final String apiValue;

  static PaymentMethodType fromApi(Object? value) {
    return switch ('$value'.toLowerCase()) {
      'mpesa' || 'm_pesa' || 'm-pesa' => PaymentMethodType.mpesa,
      'visa' => PaymentMethodType.visa,
      _ => throw FormatException('Tipo de pagamento desconhecido: $value'),
    };
  }
}

class PaymentMethod {
  const PaymentMethod({
    required this.id,
    required this.type,
    this.label,
    this.provider = 'mock',
    this.phone,
    this.accountName,
    this.cardBrand,
    this.cardLast4,
    this.expiryMonth,
    this.expiryYear,
    this.isDefault = false,
  });

  final int id;
  final PaymentMethodType type;
  final String? label;
  final String provider;
  final String? phone;
  final String? accountName;
  final String? cardBrand;
  final String? cardLast4;
  final int? expiryMonth;
  final int? expiryYear;
  final bool isDefault;

  bool get isMpesa => type == PaymentMethodType.mpesa;

  String get typeLabel => switch (type) {
    PaymentMethodType.mpesa => 'M-Pesa',
    PaymentMethodType.visa => 'Visa',
  };

  String get title {
    final custom = label?.trim();
    return custom == null || custom.isEmpty ? typeLabel : custom;
  }

  String get maskedValue {
    if (isMpesa) {
      final last4 = _lastDigits(phone);
      return last4 == null ? 'M-Pesa' : '•••• $last4';
    }
    final last4 = cardLast4 ?? '';
    return ['•••• $last4', ?expiryLabel].join(' · ');
  }

  String? get expiryLabel {
    final month = expiryMonth;
    final year = expiryYear;
    if (month == null || year == null) return null;
    return '${month.toString().padLeft(2, '0')}/${year.toString().substring(2)}';
  }

  factory PaymentMethod.fromJson(Map<String, dynamic> json) {
    final type = PaymentMethodType.fromApi(json['type']);
    return PaymentMethod(
      id: _asInt(json['id']),
      type: type,
      label: _asNullableString(json['label']),
      provider: (json['provider'] ?? 'mock') as String? ?? 'mock',
      phone: _asNullableString(json['phone']),
      accountName: _asNullableString(
        json['accountName'] ?? json['account_name'],
      ),
      cardBrand: _asNullableString(json['cardBrand'] ?? json['card_brand']),
      cardLast4: _asNullableString(json['cardLast4'] ?? json['card_last4']),
      expiryMonth: _asNullableInt(json['expiryMonth'] ?? json['expiry_month']),
      expiryYear: _asNullableInt(json['expiryYear'] ?? json['expiry_year']),
      isDefault:
          json['isDefault'] as bool? ?? json['is_default'] as bool? ?? false,
    );
  }

  static String? _lastDigits(String? value) {
    if (value == null) return null;
    final digits = value.replaceAll(RegExp(r'\D'), '');
    if (digits.length <= 4) return digits;
    return digits.substring(digits.length - 4);
  }

  static int _asInt(Object? value) =>
      value is num ? value.toInt() : int.tryParse('$value') ?? 0;

  static int? _asNullableInt(Object? value) {
    if (value == null) return null;
    if (value is num) return value.toInt();
    return int.tryParse('$value');
  }

  static String? _asNullableString(Object? value) {
    final text = value as String?;
    return text == null || text.trim().isEmpty ? null : text;
  }
}
