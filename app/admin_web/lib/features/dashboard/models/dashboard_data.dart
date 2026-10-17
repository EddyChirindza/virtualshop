class DashboardData {
  const DashboardData({
    required this.revenue,
    required this.orderCount,
    required this.pendingOrders,
    required this.lowStockCount,
    required this.customerCount,
    required this.productCount,
    required this.revenueSeries,
    required this.recentOrders,
    required this.lowStockProducts,
  });

  final double revenue;
  final int orderCount;
  final int pendingOrders;
  final int lowStockCount;
  final int customerCount;
  final int productCount;
  final List<RevenuePoint> revenueSeries;
  final List<AdminOrderSummary> recentOrders;
  final List<LowStockProduct> lowStockProducts;

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    final metrics = json['metrics'] as Map<String, dynamic>;
    return DashboardData(
      revenue: _number(metrics['revenue']),
      orderCount: _integer(metrics['orders']),
      pendingOrders: _integer(metrics['pendingOrders']),
      lowStockCount: _integer(metrics['lowStockProducts']),
      customerCount: _integer(metrics['customers']),
      productCount: _integer(metrics['products']),
      revenueSeries: (json['revenueSeries'] as List? ?? const [])
          .map((item) => RevenuePoint.fromJson(item as Map<String, dynamic>))
          .toList(),
      recentOrders: (json['recentOrders'] as List? ?? const [])
          .map((item) => AdminOrderSummary.fromJson(item as Map<String, dynamic>))
          .toList(),
      lowStockProducts: (json['lowStockProducts'] as List? ?? const [])
          .map((item) => LowStockProduct.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  static double _number(dynamic value) => double.tryParse('$value') ?? 0;
  static int _integer(dynamic value) => int.tryParse('$value') ?? 0;
}

class RevenuePoint {
  const RevenuePoint(this.label, this.value);
  final String label;
  final double value;

  factory RevenuePoint.fromJson(Map<String, dynamic> json) =>
      RevenuePoint(json['label']?.toString() ?? '', DashboardData._number(json['value']));
}

class AdminOrderSummary {
  const AdminOrderSummary({required this.id, required this.customer, required this.status, required this.total, required this.createdAt});
  final int id;
  final String customer;
  final String status;
  final double total;
  final DateTime? createdAt;

  factory AdminOrderSummary.fromJson(Map<String, dynamic> json) => AdminOrderSummary(
        id: DashboardData._integer(json['id']),
        customer: json['customer']?.toString() ?? 'Cliente',
        status: json['status']?.toString() ?? 'pending',
        total: DashboardData._number(json['total']),
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
      );
}

class LowStockProduct {
  const LowStockProduct(this.id, this.name, this.status);
  final int id;
  final String name;
  final String status;

  factory LowStockProduct.fromJson(Map<String, dynamic> json) => LowStockProduct(
        DashboardData._integer(json['id']),
        json['name']?.toString() ?? 'Produto',
        json['stock_status']?.toString() ?? 'low_stock',
      );
}
