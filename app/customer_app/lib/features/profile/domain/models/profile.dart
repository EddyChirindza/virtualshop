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
  });

  final int id;
  final String fullName;
  final String email;
  final String? phone;
  final String? photoUrl;
  final bool isVerified;
  final DateTime? dateOfBirth;
  final String? gender;

  Profile copyWith({
    String? fullName,
    String? phone,
    DateTime? dateOfBirth,
    String? gender,
  }) => Profile(
    id: id,
    fullName: fullName ?? this.fullName,
    email: email,
    phone: phone ?? this.phone,
    photoUrl: photoUrl,
    isVerified: isVerified,
    dateOfBirth: dateOfBirth ?? this.dateOfBirth,
    gender: gender ?? this.gender,
  );

  factory Profile.fromJson(Map<String, dynamic> json) {
    final rawDate =
        json['birthDate'] ?? json['birth_date'] ?? json['date_of_birth'];
    return Profile(
      id: _asInt(json['id']),
      fullName:
          (json['fullName'] ?? json['full_name'] ?? json['name']) as String? ??
          '',
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
}
