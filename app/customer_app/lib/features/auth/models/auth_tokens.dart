class AuthTokens {
  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
  });

  final String accessToken;
  final String refreshToken;

  /// Recebe o conteúdo de `data` da API:
  ///   { "user": {...}, "token": "<access>", "refreshToken": "<refresh>" }
  factory AuthTokens.fromJson(Map<String, dynamic> json) {
    return AuthTokens(
      accessToken: json['token'] as String? ?? '',
      refreshToken: json['refreshToken'] as String? ?? '',
    );
  }

  bool get isValid => accessToken.isNotEmpty && refreshToken.isNotEmpty;
}
