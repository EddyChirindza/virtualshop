class AdminProduct {
  const AdminProduct({
    required this.id,
    required this.name,
    required this.price,
    required this.stock,
    required this.rating,
    required this.isPopular,
    required this.isNewArrival,
    this.description,
    this.imageUrl,
    this.categoryId,
    this.categoryName,
    this.stockStatus,
  });

  final int id;
  final String name;
  final String? description;
  final double price;
  final int stock;
  final double rating;
  final String? imageUrl;
  final int? categoryId;
  final String? categoryName;
  final String? stockStatus;
  final bool isPopular;
  final bool isNewArrival;

  factory AdminProduct.fromJson(Map<String, dynamic> json) => AdminProduct(
        id: _int(json['id']),
        name: json['name']?.toString() ?? '',
        description: json['description']?.toString(),
        price: _double(json['price']),
        stock: _int(json['stock']),
        rating: _double(json['rating']),
        imageUrl: json['image_url']?.toString(),
        categoryId: json['category_id'] == null ? null : _int(json['category_id']),
        categoryName: json['category_name']?.toString(),
        stockStatus: json['stock_status']?.toString(),
        isPopular: json['is_popular'] == true,
        isNewArrival: json['is_new_arrival'] == true,
      );

  static int _int(dynamic value) => int.tryParse('$value') ?? 0;
  static double _double(dynamic value) => double.tryParse('$value') ?? 0;

  String get availability => stockStatus ??
      (stock <= 0 ? 'out_of_stock' : stock <= 5 ? 'low_stock' : 'in_stock');
}

class AdminCategory {
  const AdminCategory({
    required this.id,
    required this.name,
    required this.slug,
    this.iconUrl,
    this.parentId,
  });

  final int id;
  final String name;
  final String slug;
  final String? iconUrl;
  final int? parentId;

  factory AdminCategory.fromJson(Map<String, dynamic> json) => AdminCategory(
        id: int.tryParse('${json['id']}') ?? 0,
        name: json['name']?.toString() ?? '',
        slug: json['slug']?.toString() ?? '',
        iconUrl: json['icon_url']?.toString(),
        parentId: json['parent_id'] == null ? null : int.tryParse('${json['parent_id']}'),
      );
}

class AdminProductPage {
  const AdminProductPage({required this.items, required this.total, required this.page, required this.totalPages});
  final List<AdminProduct> items;
  final int total;
  final int page;
  final int totalPages;
}
