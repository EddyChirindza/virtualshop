import 'package:dio/dio.dart';

import '../constants/api_constants.dart';

class AdminApi {
  AdminApi({String? token})
      : dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 15),
          headers: {
            'Content-Type': 'application/json',
            if (token != null) 'Authorization': 'Bearer $token',
          },
        ));

  final Dio dio;
}
