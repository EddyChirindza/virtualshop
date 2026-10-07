import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/network/api_response.dart';
import '../domain/models/profile.dart';
import '../domain/models/profile_address.dart';
import '../domain/models/profile_stats.dart';

class ProfileRepository {
  ProfileRepository({required this._dio});

  final Dio _dio;

  Future<Profile> fetchProfile() async {
    try {
      final data = unwrapMap(await _dio.get(ApiConstants.userProfile));
      final user = data['user'] is Map
          ? Map<String, dynamic>.from(data['user'] as Map)
          : data;
      return Profile.fromJson(user);
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<Profile> updateProfile(Map<String, dynamic> fields) async {
    try {
      final data = unwrapMap(
        await _dio.patch(ApiConstants.userProfile, data: fields),
      );
      final user = data['user'] is Map
          ? Map<String, dynamic>.from(data['user'] as Map)
          : data;
      return Profile.fromJson(user);
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<ProfileStats> fetchStats() async {
    try {
      final data = unwrapMap(await _dio.get(ApiConstants.userStats));
      final stats = data['stats'] is Map
          ? Map<String, dynamic>.from(data['stats'] as Map)
          : data;
      return ProfileStats.fromJson(stats);
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<List<ProfileAddress>> fetchAddresses() async {
    try {
      final response = await _dio.get(ApiConstants.userAddresses);
      final body = response.data;
      final data = body is Map && body['data'] != null ? body['data'] : body;
      final rawAddresses = data is List
          ? data
          : data is Map
          ? data['items'] ?? data['addresses'] ?? const []
          : const [];
      if (rawAddresses is! List) return const [];
      return rawAddresses
          .whereType<Map>()
          .map((item) => ProfileAddress.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<ProfileAddress> createAddress(Map<String, dynamic> fields) async {
    try {
      final data = unwrapMap(
        await _dio.post(ApiConstants.userAddresses, data: fields),
      );
      return ProfileAddress.fromJson(_addressFrom(data));
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<ProfileAddress> updateAddress(
    int id,
    Map<String, dynamic> fields,
  ) async {
    try {
      final data = unwrapMap(
        await _dio.patch(ApiConstants.userAddress(id), data: fields),
      );
      return ProfileAddress.fromJson(_addressFrom(data));
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Future<void> deleteAddress(int id) async {
    try {
      await _dio.delete(ApiConstants.userAddress(id));
    } on DioException catch (error) {
      throw ApiException.fromDioException(error);
    }
  }

  Map<String, dynamic> _addressFrom(Map<String, dynamic> data) {
    final address = data['address'];
    return address is Map ? Map<String, dynamic>.from(address) : data;
  }
}