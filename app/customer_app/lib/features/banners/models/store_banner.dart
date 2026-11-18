class StoreBanner {
  const StoreBanner({
    required this.id,
    required this.titlePt,
    required this.titleEn,
    required this.imageUrl,
    required this.mobileImageUrl,
    required this.backgroundColor,
    required this.titleColor,
    required this.alignment,
    required this.overlayOpacity,
    this.subtitlePt,
    this.subtitleEn,
    this.subtitleColor,
    this.buttonTextPt,
    this.buttonTextEn,
    this.buttonColor,
    this.buttonTextColor,
  });

  final int id;
  final String titlePt;
  final String? titleEn;
  final String? subtitlePt;
  final String? subtitleEn;
  final String imageUrl;
  final String mobileImageUrl;
  final String backgroundColor;
  final String titleColor;
  final String? subtitleColor;
  final String? buttonTextPt;
  final String? buttonTextEn;
  final String? buttonColor;
  final String? buttonTextColor;
  final String alignment;
  final double overlayOpacity;

  factory StoreBanner.fromJson(Map<String, dynamic> json) {
    final style = json['style'] as Map<String, dynamic>? ?? const {};
    final title = json['title'] as Map<String, dynamic>? ?? const {};
    final subtitle = json['subtitle'] as Map<String, dynamic>? ?? const {};
    final buttonText = json['button_text'] as Map<String, dynamic>? ?? const {};
    final imageUrl = json['image_url'] as String? ?? '';

    return StoreBanner(
      id: (json['id'] as num).toInt(),
      titlePt: title['pt'] as String? ?? '',
      titleEn: title['en'] as String?,
      subtitlePt: subtitle['pt'] as String?,
      subtitleEn: subtitle['en'] as String?,
      imageUrl: imageUrl,
      mobileImageUrl: json['mobile_image_url'] as String? ?? imageUrl,
      backgroundColor: style['background_color'] as String? ?? '#111827',
      titleColor: style['title_color'] as String? ?? '#FFFFFF',
      subtitleColor: style['subtitle_color'] as String?,
      buttonTextPt: buttonText['pt'] as String?,
      buttonTextEn: buttonText['en'] as String?,
      buttonColor: style['button_color'] as String?,
      buttonTextColor: style['button_text_color'] as String?,
      alignment: style['alignment'] as String? ?? 'left',
      overlayOpacity: (style['overlay_opacity'] as num?)?.toDouble() ?? 0,
    );
  }
}
