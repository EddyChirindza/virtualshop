import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../core/providers.dart';
import '../../../../core/session/session_controller.dart';
import '../../data/profile_repository.dart';
import '../../domain/models/profile.dart';
import '../../domain/models/profile_address.dart';
import '../../domain/models/profile_stats.dart';

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  return ProfileRepository(dio: ref.watch(dioProvider));
});

const _emptyProfile = Profile(id: 0, fullName: '', email: '');

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
  Future<Profile> build() {
    final session = ref.watch(sessionControllerProvider);
    if (!session.isActive) return Future.value(_emptyProfile);
    return ref.read(profileRepositoryProvider).fetchProfile();
  }

  Future<void> refresh() async {
    final session = ref.read(sessionControllerProvider);
    if (!session.isActive) {
      state = const AsyncData(_emptyProfile);
      return;
    }
    final generation = session.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    state = const AsyncLoading<Profile>().copyWithPrevious(state);
    final result = await AsyncValue.guard(
      () => ref.read(profileRepositoryProvider).fetchProfile(),
    );
    if (!sessionController.isCurrent(generation)) return;
    state = result;
  }

  Future<Profile> updateProfile(Map<String, dynamic> fields) async {
    final generation = ref.sessionState.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    final current = state.valueOrNull;
    final requestedEmail = fields['email'];
    if (current != null &&
        current.email.trim().isNotEmpty &&
        fields.containsKey('email') &&
        (requestedEmail is! String ||
            requestedEmail.trim() != current.email.trim())) {
      throw ApiException(
        message: 'O e-mail não pode ser alterado depois de guardado.',
        type: ApiErrorType.validation,
      );
    }
    final responseProfile = await ref
        .read(profileRepositoryProvider)
        .updateProfile(fields);
    if (!sessionController.isCurrent(generation)) return responseProfile;
    final profile = current == null
        ? responseProfile
        : Profile(
            id: responseProfile.id == 0 ? current.id : responseProfile.id,
            fullName: responseProfile.fullName.isNotEmpty
                ? responseProfile.fullName
                : fields['fullName'] as String? ?? current.fullName,
            email: responseProfile.email.isNotEmpty
                ? responseProfile.email
                : fields['email'] as String? ?? current.email,
            phone:
                responseProfile.phone ??
                fields['phone'] as String? ??
                current.phone,
            photoUrl: responseProfile.photoUrl ?? current.photoUrl,
            isVerified: responseProfile.isVerified || current.isVerified,
            dateOfBirth: fields.containsKey('birthDate')
                ? (fields['birthDate'] == null
                      ? null
                      : responseProfile.dateOfBirth ?? current.dateOfBirth)
                : responseProfile.dateOfBirth ?? current.dateOfBirth,
            gender: fields.containsKey('gender')
                ? fields['gender'] as String?
                : responseProfile.gender ?? current.gender,
            firstName: responseProfile.firstName.isNotEmpty
                ? responseProfile.firstName
                : fields['firstName'] as String? ?? current.firstName,
            lastName: responseProfile.lastName.isNotEmpty
                ? responseProfile.lastName
                : fields['lastName'] as String? ?? current.lastName,
          );
    state = AsyncData(profile);
    return profile;
  }

  Future<Profile> updateProfilePhoto(List<int> bytes) async {
    final generation = ref.sessionState.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    final current = state.valueOrNull;
    final responseProfile = await ref
        .read(profileRepositoryProvider)
        .updateProfilePhoto(bytes);
    if (!sessionController.isCurrent(generation)) return responseProfile;
    final profile = current == null
        ? responseProfile
        : Profile(
            id: responseProfile.id == 0 ? current.id : responseProfile.id,
            fullName: responseProfile.fullName.isEmpty
                ? current.fullName
                : responseProfile.fullName,
            email: responseProfile.email.isEmpty
                ? current.email
                : responseProfile.email,
            phone: responseProfile.phone ?? current.phone,
            photoUrl: responseProfile.photoUrl,
            isVerified: responseProfile.isVerified || current.isVerified,
            dateOfBirth: responseProfile.dateOfBirth ?? current.dateOfBirth,
            gender: responseProfile.gender ?? current.gender,
            firstName: responseProfile.firstName.isEmpty
                ? current.firstName
                : responseProfile.firstName,
            lastName: responseProfile.lastName.isEmpty
                ? current.lastName
                : responseProfile.lastName,
          );
    state = AsyncData(profile);
    return profile;
  }

  Future<Profile> deleteProfilePhoto() async {
    final generation = ref.sessionState.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    final current = state.valueOrNull;
    final responseProfile = await ref
        .read(profileRepositoryProvider)
        .deleteProfilePhoto();
    if (!sessionController.isCurrent(generation)) return responseProfile;
    final profile = current == null
        ? responseProfile
        : Profile(
            id: responseProfile.id == 0 ? current.id : responseProfile.id,
            fullName: responseProfile.fullName.isEmpty
                ? current.fullName
                : responseProfile.fullName,
            email: responseProfile.email.isEmpty
                ? current.email
                : responseProfile.email,
            phone: responseProfile.phone ?? current.phone,
            photoUrl: responseProfile.photoUrl,
            isVerified: responseProfile.isVerified || current.isVerified,
            dateOfBirth: responseProfile.dateOfBirth ?? current.dateOfBirth,
            gender: responseProfile.gender ?? current.gender,
            firstName: responseProfile.firstName.isEmpty
                ? current.firstName
                : responseProfile.firstName,
            lastName: responseProfile.lastName.isEmpty
                ? current.lastName
                : responseProfile.lastName,
          );
    state = AsyncData(profile);
    return profile;
  }
}

class ProfileStatsController extends AsyncNotifier<ProfileStats> {
  @override
  Future<ProfileStats> build() {
    final session = ref.watch(sessionControllerProvider);
    if (!session.isActive) return Future.value(const ProfileStats());
    return ref.read(profileRepositoryProvider).fetchStats();
  }

  Future<void> refresh() async {
    final session = ref.read(sessionControllerProvider);
    if (!session.isActive) {
      state = const AsyncData(ProfileStats());
      return;
    }
    final generation = session.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    state = const AsyncLoading<ProfileStats>().copyWithPrevious(state);
    final result = await AsyncValue.guard(
      () => ref.read(profileRepositoryProvider).fetchStats(),
    );
    if (!sessionController.isCurrent(generation)) return;
    state = result;
  }
}

class ProfileAddressesController extends AsyncNotifier<List<ProfileAddress>> {
  @override
  Future<List<ProfileAddress>> build() {
    final session = ref.watch(sessionControllerProvider);
    if (!session.isActive) return Future.value(const <ProfileAddress>[]);
    return ref.read(profileRepositoryProvider).fetchAddresses();
  }

  Future<void> refresh() async {
    final session = ref.read(sessionControllerProvider);
    if (!session.isActive) {
      state = const AsyncData(<ProfileAddress>[]);
      return;
    }
    final generation = session.generation;
    final sessionController = ref.read(sessionControllerProvider.notifier);
    state = const AsyncLoading<List<ProfileAddress>>().copyWithPrevious(state);
    final result = await AsyncValue.guard(
      () => ref.read(profileRepositoryProvider).fetchAddresses(),
    );
    if (!sessionController.isCurrent(generation)) return;
    state = result;
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
