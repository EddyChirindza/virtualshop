import 'package:dio/dio.dart';

/// A single, uniform error type the rest of the app deals with.
/// Every repository catches DioException and rethrows this instead,
/// so UI code never has to know about Dio internals.
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final ApiErrorType type;

  ApiException({
    required this.message,
    required this.type,
    this.statusCode,
  });

  factory ApiException.fromDioException(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException(
          message: 'Tempo de ligação esgotado. Verifica a tua internet.',
          type: ApiErrorType.timeout,
        );

      case DioExceptionType.connectionError:
        return ApiException(
          message: 'Sem ligação ao servidor.',
          type: ApiErrorType.network,
        );

      case DioExceptionType.badResponse:
        final status = e.response?.statusCode;
        final data = e.response?.data;
        final serverMessage = (data is Map && data['message'] is String)
            ? data['message'] as String
            : null;

        switch (status) {
          case 400:
            return ApiException(
              message: serverMessage ?? 'Pedido inválido.',
              type: ApiErrorType.validation,
              statusCode: status,
            );
          case 401:
            return ApiException(
              message: serverMessage ?? 'Sessão expirada. Inicia sessão novamente.',
              type: ApiErrorType.unauthorized,
              statusCode: status,
            );
          case 403:
            return ApiException(
              message: serverMessage ?? 'Sem permissão para esta ação.',
              type: ApiErrorType.forbidden,
              statusCode: status,
            );
          case 404:
            return ApiException(
              message: serverMessage ?? 'Recurso não encontrado.',
              type: ApiErrorType.notFound,
              statusCode: status,
            );
          case 429:
            return ApiException(
              message: serverMessage ?? 'Demasiados pedidos. Tenta mais tarde.',
              type: ApiErrorType.rateLimited,
              statusCode: status,
            );
          default:
            return ApiException(
              message: serverMessage ?? 'Erro no servidor.',
              type: ApiErrorType.server,
              statusCode: status,
            );
        }

      case DioExceptionType.cancel:
        return ApiException(message: 'Pedido cancelado.', type: ApiErrorType.cancelled);

      default:
        return ApiException(
          message: 'Ocorreu um erro inesperado.',
          type: ApiErrorType.unknown,
        );
    }
  }

  @override
  String toString() => message;
}

enum ApiErrorType {
  timeout,
  network,
  validation,
  unauthorized,
  forbidden,
  notFound,
  rateLimited,
  server,
  cancelled,
  unknown,
}
