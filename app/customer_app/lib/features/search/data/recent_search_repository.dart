import 'package:shared_preferences/shared_preferences.dart';

class RecentSearchRepository {
  RecentSearchRepository({int? userId}) : _userId = userId;

  static const _maxSearches = 8;

  final int? _userId;

  String get _storageKey => 'recent_searches_${_userId ?? "guest"}';

  Future<List<String>> getAll() async {
    final preferences = await SharedPreferences.getInstance();
    return preferences.getStringList(_storageKey) ?? const [];
  }

  Future<void> add(String query) async {
    final normalized = query.trim();
    if (normalized.isEmpty) return;

    final preferences = await SharedPreferences.getInstance();
    final recent = preferences.getStringList(_storageKey) ?? <String>[];
    recent.removeWhere(
      (item) => item.toLowerCase() == normalized.toLowerCase(),
    );
    recent.insert(0, normalized);
    await preferences.setStringList(
      _storageKey,
      recent.take(_maxSearches).toList(),
    );
  }

  Future<void> remove(String query) async {
    final preferences = await SharedPreferences.getInstance();
    final recent = preferences.getStringList(_storageKey) ?? <String>[];
    recent.removeWhere((item) => item == query);
    await preferences.setStringList(_storageKey, recent);
  }

  Future<void> clear() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.remove(_storageKey);
  }
}
