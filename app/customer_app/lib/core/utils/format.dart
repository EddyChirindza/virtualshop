/// Formata um valor em Meticais: 1250.5 -> "1 250,50 MT".
String formatMoney(double value) {
  final fixed = value.toStringAsFixed(2);
  final parts = fixed.split('.');
  final intPart = parts[0].replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => ' ',
  );
  return '$intPart,${parts[1]} MT';
}

/// A API devolve colunas NUMERIC do PostgreSQL como texto ("150.00"),
/// mas noutros casos podem vir como número. Aceita ambos.
double parseDouble(Object? value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0;
  return 0;
}

int parseInt(Object? value) {
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}
