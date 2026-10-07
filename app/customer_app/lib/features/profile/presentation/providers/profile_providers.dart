import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/providers.dart';
import '../../data/profile_repository.dart';
import '../../domain/models/profile.dart';
import '../../domain/models/profile_address.dart';
import '../../domain/models/profile_stats.dart';

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  return ProfileRepository(dio: ref.watch(dioProvider));
});

final profileProvider = AsyncNotifierProvider<ProfileController, Profile>(
  ProfileController.new,
);

final profileStatsProvider =
    AsyncNotifierProvider<ProfileStatsController, ProfileStats>(
      ProfileStatsController.new,
    );

final profileAddressesProvider =
    AsyncNotifierProvider<ProfileAddressesController, List<ProfileAddress>>(
      ProfileAddressesController.new,
    );

class ProfileController extends AsyncNotifier<Profile> {
  @override
  Future<Profile> build() => ref.read(profileRepositoryProvider).fetchProfile();

  Future<void> refresh() async {
    state = const AsyncLoading<Profile>().copyWithPrevious(state);
    state = await AsyncValue.guard(
      () => ref.read(profileRepositoryProvider).fetchProfile(),
    );
  }

  Future<Profile> updateProfile(Map<String, dynamic> fields) async {
    final current = state.valueOrNull;
    final responseProfile = await ref
        .read(profileRepositoryProvider)
        .updateProfile(fields);
    final profile = current == null
      ? responseProfile
      : Profile(
        id: responseProfile.id == 0 ? current.id : responseProfile.id,
        fullName: responseProfile.fullName.isEmpty
          ? fields['full_name'] as String? ?? current.fullName
          : responseProfile.fullName,
        email: responseProfile.email.isEmpty
          ? current.email
          : responseProfile.email,
        phone: fields['phone'] as String? ?? responseProfile.phone ?? current.phone,
        photoUrl: responseProfile.photoUrl ?? current.photoUrl,
        isVerified: responseProfile.isVerified || current.isVerified,
        dateOfBirth: responseProfile.dateOfBirth ?? current.dateOfBirth,
        gender: fields['gender'] as String? ?? responseProfile.gender ?? current.gender,
        );
    state = AsyncData(profile);
    return profile;
  }
}

class ProfileStatsController extends AsyncNotifier<ProfileStats> {
  @override
  Future<ProfileStats> build() =>
      ref.read(profileRepositoryProvider).fetchStats();

  Future<void> refresh() async {
    state = const AsyncLoading<ProfileStats>().copyWithPrevious(state);
    state = await AsyncValue.guard(
      () => ref.read(profileRepositoryProvider).fetchStats(),
    );
  }
}

class ProfileAddressesController extends AsyncNotifier<List<ProfileAddress>> {
  @override
  Future<List<ProfileAddress>> build() =>
      ref.read(profileRepositoryProvider).fetchAddresses();

  Future<void> refresh() async {
    state = const AsyncLoading<List<ProfileAddress>>().copyWithPrevious(state);
    state = await AsyncValue.guard(
      () => ref.read(profileRepositoryProvider).fetchAddresses(),
    );
  }

  Future<void> add(Map<String, dynamic> fields) async {
    await ref.read(profileRepositoryProvider).createAddress(fields);
    await refresh();
  }

  Future<void> updateAddress(int id, Map<String, dynamic> fields) async {
    await ref.read(profileRepositoryProvider).updateAddress(id, fields);
    await refresh();
  }

  Future<void> remove(int id) async {
    await ref.read(profileRepositoryProvider).deleteAddress(id);
    await refresh();
  }
}