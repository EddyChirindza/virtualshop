import '../../../../core/utils/format.dart';

class CustomerOrder {
  const CustomerOrder({
    required this.id,
    required this.status,
    required this.paymentStatus,
    required this.deliveryMethod,
    required this.subtotal,
    required this.discount,
    required this.deliveryFee,
    required this.total,
    this.createdAt,
    this.updatedAt,
    this.address,
    this.paymentMethod,
    this.items = const [],
    this.rejectionReason,
    this.notes,
    this.couponCode,
  });

  final int id;
  final String status;
  final String paymentStatus;
  final String deliveryMethod;
  final double subtotal;
  final double discount;
  final double deliveryFee;
  final double total;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final CustomerOrderAddress? address;
  final CustomerOrderPaymentMethod? paymentMethod;
  final List<CustomerOrderItem> items;
  final String? rejectionReason;
  final String? notes;
  final String? couponCode;

  bool get isHomeDelivery => deliveryMethod == 'home_delivery';

  factory CustomerOrder.fromJson(Map<String, dynamic> json) => CustomerOrder(
    id: parseInt(json['id']),
    status: json['status']?.toString() ?? 'pending',
    paymentStatus: json['paymentStatus']?.toString() ?? 'pending',
    deliveryMethod: json['deliveryMethod']?.toString() ?? 'store_pickup',
    subtotal: parseDouble(json['subtotal']),
    discount: parseDouble(json['discount']),
    deliveryFee: parseDouble(json['deliveryFee']),
    total: parseDouble(json['total']),
    createdAt: _date(json['createdAt']),
    updatedAt: _date(json['updatedAt']),
    address: json['address'] is Map
        ? CustomerOrderAddress.fromJson(
            Map<String, dynamic>.from(json['address'] as Map),
          )
        : null,
    paymentMethod: json['paymentMethod'] is Map
        ? CustomerOrderPaymentMethod.fromJson(
            Map<String, dynamic>.from(json['paymentMethod'] as Map),
          )
        : null,
    items: (json['items'] as List? ?? const [])
        .whereType<Map>()
        .map(
          (item) => CustomerOrderItem.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList(),
    rejectionReason: _text(json['rejectionReason']),
    notes: _text(json['notes']),
    couponCode: _text(json['couponCode']),
  );
}

class CustomerOrderAddress {
  const CustomerOrderAddress({
    required this.id,
    this.label,
    this.province,
    this.city,
    this.neighborhood,
    this.street,
    this.number,
    this.reference,
  });

  final int id;
  final String? label;
  final String? province;
  final String? city;
  final String? neighborhood;
  final String? street;
  final String? number;
  final String? reference;

  String get summary => [
    [street, number].where(_notEmpty).join(', '),
    neighborhood,
    city,
    province,
  ].where(_notEmpty).join(' · ');

  factory CustomerOrderAddress.fromJson(Map<String, dynamic> json) =>
      CustomerOrderAddress(
        id: parseInt(json['id']),
        label: _text(json['label']),
        province: _text(json['province']),
        city: _text(json['city']),
        neighborhood: _text(json['neighborhood']),
        street: _text(json['street']),
        number: _text(json['number']),
        reference: _text(json['reference']),
      );
}

class CustomerOrderPaymentMethod {
  const CustomerOrderPaymentMethod({
    required this.id,
    required this.type,
    this.label,
    this.cardLast4,
    this.phone,
  });

  final int id;
  final String type;
  final String? label;
  final String? cardLast4;
  final String? phone;

  String get displayLabel {
    final custom = label?.trim();
    if (custom != null && custom.isNotEmpty) return custom;
    return type == 'mpesa' ? 'M-Pesa' : 'Visa';
  }

  String get maskedValue {
    if (type == 'mpesa') {
      final digits = (phone ?? '').replaceAll(RegExp(r'\D'), '');
      return digits.length >= 4
          ? '•••• ${digits.substring(digits.length - 4)}'
          : 'M-Pesa';
    }
    return cardLast4 == null ? 'Visa' : '•••• $cardLast4';
  }

  factory CustomerOrderPaymentMethod.fromJson(Map<String, dynamic> json) =>
      CustomerOrderPaymentMethod(
        id: parseInt(json['id']),
        type: json['type']?.toString() ?? 'visa',
        label: _text(json['label']),
        cardLast4: _text(json['cardLast4']),
        phone: _text(json['phone']),
      );
}

class CustomerOrderItem {
  const CustomerOrderItem({
    required this.productId,
    required this.name,
    required this.quantity,
    required this.unitPrice,
    required this.subtotal,
    this.image,
  });

  final int productId;
  final String name;
  final int quantity;
  final double unitPrice;
  final double subtotal;
  final String? image;

  factory CustomerOrderItem.fromJson(Map<String, dynamic> json) {
    final product = json['product'] is Map
        ? Map<String, dynamic>.from(json['product'] as Map)
        : const <String, dynamic>{};
    return CustomerOrderItem(
      productId: parseInt(json['productId'] ?? product['id']),
      name: (product['name'] ?? json['name'] ?? 'Produto').toString(),
      quantity: parseInt(json['quantity']),
      unitPrice: parseDouble(json['unitPrice']),
      subtotal: parseDouble(json['subtotal']),
      image: _text(product['image'] ?? product['image_url']),
    );
  }
}

bool _notEmpty(String? value) => value != null && value.trim().isNotEmpty;

String? _text(Object? value) {
  final text = value?.toString().trim();
  return text == null || text.isEmpty ? null : text;
}

DateTime? _date(Object? value) =>
    value == null ? null : DateTime.tryParse(value.toString());
