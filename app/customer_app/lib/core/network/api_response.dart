import 'package:dio/dio.dart';

/// A API responde SEMPRE com o envelope:
///   { "success": true, "message": "OK", "data": ... }
///
/// Estes helpers extraem o `data` num único sítio, para que os repositórios
/// não tenham de saber do envelope (e para o dia em que o formato mudar,
/// haver só um ficheiro a alterar).
Map<String, dynamic> unwrapMap(Response<dynamic> response) {
  final data = _data(response);
  if (data is Map<String, dynamic>) return data;
  throw const FormatException('Resposta da API inválida (esperava um objeto).');
}

List<dynamic> unwrapList(Response<dynamic> response) {
  final data = _data(response);
  if (data is List) return data;
  throw const FormatException('Resposta da API inválida (esperava uma lista).');
}

dynamic _data(Response<dynamic> response) {
  final body = response.data;
  if (body is Map<String, dynamic> && body.containsKey('data')) {
    return body['data'];
  }
  return body;
}
