class Profile {
  const Profile({
    required this.id,
    required this.fullName,
    required this.email,
    this.phone,
    this.photoUrl,
    this.isVerified = false,
    this.dateOfBirth,
    this.gender,
    this.firstName = '',
    this.lastName = '',
  });

  final int id;
  final String fullName;
  final String email;
  final String? phone;
  final String? photoUrl;
  final bool isVerified;
  final DateTime? dateOfBirth;
  final String? gender;
  final String firstName;
  final String lastName;

  String get displayFirstName {
    if (firstName.isNotEmpty) return firstName;
    final parts = fullName.trim().split(RegExp(r'\s+'));
    return parts.isEmpty || parts.first.isEmpty ? '' : parts.first;
  }

  String get displayLastName {
    if (lastName.isNotEmpty) return lastName;
    final parts = fullName.trim().split(RegExp(r'\s+'));
    return parts.length > 1 ? parts.skip(1).join(' ') : '';
  }

  Profile copyWith({
    String? fullName,
    String? phone,
    DateTime? dateOfBirth,
    String? gender,
    String? firstName,
    String? lastName,
  }) => Profile(
    id: id,
    fullName: fullName ?? this.fullName,
    email: email,
    phone: phone ?? this.phone,
    photoUrl: photoUrl,
    isVerified: isVerified,
    dateOfBirth: dateOfBirth ?? this.dateOfBirth,
    gender: gender ?? this.gender,
    firstName: firstName ?? this.firstName,
    lastName: lastName ?? this.lastName,
  );

  factory Profile.fromJson(Map<String, dynamic> json) {
    final rawDate =
        json['birthDate'] ?? json['birth_date'] ?? json['date_of_birth'];
    final firstName = (json['firstName'] ?? json['first_name']) as String?;
    final lastName = (json['lastName'] ?? json['last_name']) as String?;
    final fullName =
        (json['fullName'] ?? json['full_name'] ?? json['name']) as String?;
    return Profile(
      id: _asInt(json['id']),
      fullName: fullName?.trim().isNotEmpty == true
          ? fullName!.trim()
          : [firstName, lastName]
                .whereType<String>()
                .where((part) => part.trim().isNotEmpty)
                .map((part) => part.trim())
                .join(' '),
      firstName: firstName?.trim().isNotEmpty == true
          ? firstName!.trim()
          : _splitLegacyName(fullName).$1,
      lastName: lastName?.trim().isNotEmpty == true
          ? lastName!.trim()
          : _splitLegacyName(fullName).$2,
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String?,
      photoUrl:
          (json['photoUrl'] ??
                  json['avatarUrl'] ??
                  json['photo_url'] ??
                  json['avatar_url'] ??
                  json['image_url'])
              as String?,
      isVerified:
          json['isVerified'] as bool? ?? json['is_verified'] as bool? ?? false,
      dateOfBirth: rawDate is String ? DateTime.tryParse(rawDate) : null,
      gender: json['gender'] as String?,
    );
  }

  static int _asInt(Object? value) =>
      value is num ? value.toInt() : int.tryParse('$value') ?? 0;

  static (String, String) _splitLegacyName(String? value) {
    final parts = (value ?? '').trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return ('', '');
    return (parts.first, parts.length > 1 ? parts.skip(1).join(' ') : '');
  }
}
