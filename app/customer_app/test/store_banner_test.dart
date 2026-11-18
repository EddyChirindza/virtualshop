import 'package:customer_app/features/banners/models/store_banner.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses the public banner response, including mobile presentation', () {
    final banner = StoreBanner.fromJson({
      'id': 42,
      'title': {'pt': 'Promoção', 'en': 'Sale'},
      'subtitle': {'pt': 'Até 30% de desconto', 'en': 'Up to 30% off'},
      'image_url': '/uploads/banners/desktop.webp',
      'mobile_image_url': '/uploads/banners/mobile.webp',
      'style': {
        'background_color': '#111827',
        'title_color': '#FFFFFF',
        'subtitle_color': '#E5E7EB',
        'button_color': '#F59E0B',
        'button_text_color': '#111827',
        'alignment': 'center',
        'overlay_opacity': 0.25,
      },
      'button_text': {'pt': 'Comprar', 'en': 'Shop now'},
    });

    expect(banner.id, 42);
    expect(banner.titlePt, 'Promoção');
    expect(banner.titleEn, 'Sale');
    expect(banner.mobileImageUrl, '/uploads/banners/mobile.webp');
    expect(banner.buttonTextEn, 'Shop now');
    expect(banner.alignment, 'center');
    expect(banner.overlayOpacity, 0.25);
  });

  test('falls back to the main image and default presentation styles', () {
    final banner = StoreBanner.fromJson({
      'id': 1,
      'title': {'pt': 'Novidades'},
      'image_url': '/uploads/banners/new.webp',
      'style': const <String, dynamic>{},
    });

    expect(banner.mobileImageUrl, '/uploads/banners/new.webp');
    expect(banner.backgroundColor, '#111827');
    expect(banner.titleColor, '#FFFFFF');
    expect(banner.alignment, 'left');
    expect(banner.overlayOpacity, 0);
  });
}
