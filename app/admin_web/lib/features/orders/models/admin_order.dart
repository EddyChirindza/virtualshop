class AdminOrderPage {
  const AdminOrderPage({
    required this.items,
    required this.page,
    required this.total,
    required this.totalPages,
  });

  final List<AdminOrder> items;
  final int page;
  final int total;
  final int totalPages;

  factory AdminOrderPage.fromJson(Map<String, dynamic> json) => AdminOrderPage(
    items: (json['items'] as List? ?? const [])
        .whereType<Map>()
        .map((item) => AdminOrder.fromJson(Map<String, dynamic>.from(item)))
        .toList(),
    page: _integer(json['page']),
    total: _integer(json['total']),
    totalPages: _integer(json['totalPages']),
  );
}

class AdminOrderCustomer {
  const AdminOrderCustomer({
    required this.id,
    required this.name,
    this.email,
    this.phone,
  });

  final int id;
  final String name;
  final String? email;
  final String? phone;

  factory AdminOrderCustomer.fromJson(Map<String, dynamic> json) =>
      AdminOrderCustomer(
        id: _integer(json['id']),
        name: json['name']?.toString() ?? 'Cliente',
        email: _text(json['email']),
        phone: _text(json['phone']),
      );
}

class AdminOrderAddress {
  const AdminOrderAddress({
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

  factory AdminOrderAddress.fromJson(Map<String, dynamic> json) =>
      AdminOrderAddress(
        id: _integer(json['id']),
        label: _text(json['label']),
        province: _text(json['province']),
        city: _text(json['city']),
        neighborhood: _text(json['neighborhood']),
        street: _text(json['street']),
        number: _text(json['number']),
        reference: _text(json['reference']),
      );
}

class AdminOrderPaymentMethod {
  const AdminOrderPaymentMethod({
    required this.id,
    required this.type,
    this.label,
    this.provider,
    this.cardLast4,
    this.phone,
  });

  final int id;
  final String type;
  final String? label;
  final String? provider;
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

  factory AdminOrderPaymentMethod.fromJson(Map<String, dynamic> json) =>
      AdminOrderPaymentMethod(
        id: _integer(json['id']),
        type: json['type']?.toString() ?? 'visa',
        label: _text(json['label']),
        provider: _text(json['provider']),
        cardLast4: _text(json['cardLast4']),
        phone: _text(json['phone']),
      );
}

class AdminOrderItem {
  const AdminOrderItem({
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

  factory AdminOrderItem.fromJson(Map<String, dynamic> json) {
    final product = json['product'] is Map
        ? Map<String, dynamic>.from(json['product'] as Map)
        : const <String, dynamic>{};
    return AdminOrderItem(
      productId: _integer(json['productId'] ?? product['id']),
      name: (product['name'] ?? json['name'] ?? 'Produto').toString(),
      quantity: _integer(json['quantity']),
      unitPrice: _number(json['unitPrice']),
      subtotal: _number(json['subtotal']),
      image: _text(product['image'] ?? product['image_url']),
    );
  }
}

class AdminOrder {
  const AdminOrder({
    required this.id,
    required this.status,
    required this.paymentStatus,
    required this.deliveryMethod,
    required this.subtotal,
    required this.discount,
    required this.deliveryFee,
    required this.total,
    required this.createdAt,
    this.updatedAt,
    this.customer,
    this.address,
    this.paymentMethod,
    this.items = const [],
    this.rejectionReason,
    this.couponCode,
    this.notes,
    this.itemCount = 0,
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
  final AdminOrderCustomer? customer;
  final AdminOrderAddress? address;
  final AdminOrderPaymentMethod? paymentMethod;
  final List<AdminOrderItem> items;
  final String? rejectionReason;
  final String? couponCode;
  final String? notes;
  final int itemCount;

  bool get isHomeDelivery => deliveryMethod == 'home_delivery';

  factory AdminOrder.fromJson(Map<String, dynamic> json) => AdminOrder(
    id: _integer(json['id']),
    status: json['status']?.toString() ?? 'pending',
    paymentStatus: json['paymentStatus']?.toString() ?? 'pending',
    deliveryMethod: json['deliveryMethod']?.toString() ?? 'store_pickup',
    subtotal: _number(json['subtotal']),
    discount: _number(json['discount']),
    deliveryFee: _number(json['deliveryFee']),
    total: _number(json['total']),
    createdAt: _date(json['createdAt']),
    updatedAt: _date(json['updatedAt']),
    customer: json['customer'] is Map
        ? AdminOrderCustomer.fromJson(
            Map<String, dynamic>.from(json['customer'] as Map),
          )
        : null,
    address: json['address'] is Map
        ? AdminOrderAddress.fromJson(
            Map<String, dynamic>.from(json['address'] as Map),
          )
        : null,
    paymentMethod: json['paymentMethod'] is Map
        ? AdminOrderPaymentMethod.fromJson(
            Map<String, dynamic>.from(json['paymentMethod'] as Map),
          )
        : null,
    items: (json['items'] as List? ?? const [])
        .whereType<Map>()
        .map((item) => AdminOrderItem.fromJson(Map<String, dynamic>.from(item)))
        .toList(),
    rejectionReason: _text(json['rejectionReason']),
    couponCode: _text(json['couponCode']),
    notes: _text(json['notes']),
    itemCount: _integer(json['itemCount']),
  );
}

bool _notEmpty(String? value) => value != null && value.trim().isNotEmpty;
String? _text(Object? value) {
  final text = value?.toString().trim();
  return text == null || text.isEmpty ? null : text;
}

int _integer(Object? value) =>
    value is num ? value.toInt() : int.tryParse('$value') ?? 0;
double _number(Object? value) =>
    value is num ? value.toDouble() : double.tryParse('$value') ?? 0;
DateTime? _date(Object? value) =>
    value == null ? null : DateTime.tryParse(value.toString());
