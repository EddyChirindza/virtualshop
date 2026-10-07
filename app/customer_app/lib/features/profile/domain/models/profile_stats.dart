import '../../../../core/utils/format.dart';

class ProfileStats {
  const ProfileStats({
    this.totalOrders = 0,
    this.totalSpent = 0,
    this.averageRating,
    this.favoritesCount = 0,
  });

  final int totalOrders;
  final double totalSpent;
  final double? averageRating;
  final int favoritesCount;

  factory ProfileStats.fromJson(Map<String, dynamic> json) => ProfileStats(
    totalOrders: parseInt(json['total_orders'] ?? json['totalOrders']),
    totalSpent: parseDouble(json['total_spent'] ?? json['totalSpent']),
    averageRating: _nullableDouble(json['average_rating'] ?? json['averageRating']),
    favoritesCount: parseInt(
      json['favorites_count'] ?? json['total_favorites'] ?? json['favoritesCount'],
    ),
  );

  static double? _nullableDouble(Object? value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    return double.tryParse('$value');
  }
}