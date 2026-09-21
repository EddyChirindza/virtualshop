class Category {
  const Category({
    required this.id,
    required this.name,
    required this.slug,
    this.iconUrl,
    this.parentId,
    this.children = const [],
  });

  final int id;
  final String name;
  final String slug;
  final String? iconUrl;
  final int? parentId;
  final List<Category> children;

  bool get hasChildren => children.isNotEmpty;

  /// GET /categories?tree=true -> [{ id, name, slug, icon_url, parent_id, children: [...] }]
  factory Category.fromJson(Map<String, dynamic> json) {
    final rawChildren = json['children'];
    return Category(
      id: (json['id'] as num).toInt(),
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      iconUrl: json['icon_url'] as String?,
      parentId: (json['parent_id'] as num?)?.toInt(),
      children: rawChildren is List
          ? rawChildren
              .whereType<Map<String, dynamic>>()
              .map(Category.fromJson)
              .toList()
          : const [],
    );
  }
}
