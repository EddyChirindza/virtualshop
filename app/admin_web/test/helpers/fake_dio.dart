import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:admin_web/core/network/admin_api.dart';
import 'package:dio/dio.dart';

typedef FakeRequestHandler = FutureOr<ResponseBody> Function(
  RequestOptions request,
);

class FakeHttpClientAdapter implements HttpClientAdapter {
  FakeHttpClientAdapter(this.handler);

  final FakeRequestHandler handler;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}

class FakeAdminApi {
  FakeAdminApi(FakeRequestHandler handler)
    : adapter = FakeHttpClientAdapter(handler),
      dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000/api')) {
    dio.httpClientAdapter = adapter;
    api = AdminApi(dio: dio);
  }

  final FakeHttpClientAdapter adapter;
  final Dio dio;
  late final AdminApi api;

  List<RequestOptions> get requests => adapter.requests;
}

ResponseBody jsonResponse(Object? body, {int statusCode = 200}) =>
    ResponseBody.fromString(
      body == null ? '' : jsonEncode(body),
      statusCode,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
