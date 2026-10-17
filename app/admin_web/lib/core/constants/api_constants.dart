class ApiConstants {
  ApiConstants._();

  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api',
  );

  static String resolveImageUrl(String path) {
    final uri = Uri.tryParse(path);
    if (uri != null && uri.hasScheme) return path;
    return Uri.parse(baseUrl).resolve(path).toString();
  }
}
