import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/app_text.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/widgets/error_retry.dart';
import '../../../theme/app_theme.dart';
import '../models/store_banner.dart';
import '../providers/banner_providers.dart';

class BannerCarousel extends ConsumerStatefulWidget {
  const BannerCarousel({super.key});

  @override
  ConsumerState<BannerCarousel> createState() => _BannerCarouselState();
}

class _BannerCarouselState extends ConsumerState<BannerCarousel> {
  final _pageController = PageController();
  int _currentPage = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final banners = ref.watch(bannersProvider);
    return banners.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: 20),
        child: SizedBox(
          height: 176,
          child: Center(child: CircularProgressIndicator()),
        ),
      ),
      error: (error, _) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: SizedBox(
          height: 176,
          child: ErrorRetry(
            message: error is ApiException
                ? error.message
                : appText(
                    context,
                    'Não foi possível carregar os banners.',
                    'Could not load banners.',
                  ),
            onRetry: () => ref.invalidate(bannersProvider),
          ),
        ),
      ),
      data: (items) {
        if (items.isEmpty) return const SizedBox.shrink();
        if (_currentPage >= items.length) _currentPage = items.length - 1;
        return Padding(
          padding: const EdgeInsets.only(top: 20, bottom: 24),
          child: Column(
            children: [
              SizedBox(
                height: 176,
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: items.length,
                  onPageChanged: (page) => setState(() => _currentPage = page),
                  itemBuilder: (context, index) =>
                      _BannerCard(banner: items[index]),
                ),
              ),
              if (items.length > 1) ...[
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (var index = 0; index < items.length; index++)
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        width: index == _currentPage ? 18 : 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: index == _currentPage
                              ? AppColors.brand
                              : AppColors.brand.withValues(alpha: 0.25),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                  ],
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _BannerCard extends StatelessWidget {
  const _BannerCard({required this.banner});

  final StoreBanner banner;

  @override
  Widget build(BuildContext context) {
    final alignment = switch (banner.alignment) {
      'center' => Alignment.center,
      'right' => Alignment.centerRight,
      _ => Alignment.centerLeft,
    };
    final textAlignment = switch (banner.alignment) {
      'center' => TextAlign.center,
      'right' => TextAlign.right,
      _ => TextAlign.left,
    };
    final titleColor = _parseColor(banner.titleColor, Colors.white);
    final subtitleColor = _parseColor(
      banner.subtitleColor,
      titleColor.withValues(alpha: 0.85),
    );
    final buttonLabel = Localizations.localeOf(context).languageCode == 'en'
        ? banner.buttonTextEn ?? banner.buttonTextPt
        : banner.buttonTextPt ?? banner.buttonTextEn;
    final title = Localizations.localeOf(context).languageCode == 'en'
        ? banner.titleEn ?? banner.titlePt
        : banner.titlePt;
    final subtitle = Localizations.localeOf(context).languageCode == 'en'
        ? banner.subtitleEn ?? banner.subtitlePt
        : banner.subtitlePt;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 1),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          fit: StackFit.expand,
          children: [
            ColoredBox(
              color: _parseColor(banner.backgroundColor, AppColors.brand),
            ),
            Image.network(
              ApiConstants.resolveImageUrl(banner.mobileImageUrl),
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) =>
                  const SizedBox.shrink(),
            ),
            if (banner.overlayOpacity > 0)
              ColoredBox(
                color: Colors.black.withValues(
                  alpha: banner.overlayOpacity.clamp(0, 1).toDouble(),
                ),
              ),
            Align(
              alignment: alignment,
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: switch (banner.alignment) {
                    'center' => CrossAxisAlignment.center,
                    'right' => CrossAxisAlignment.end,
                    _ => CrossAxisAlignment.start,
                  },
                  children: [
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      textAlign: textAlignment,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: titleColor,
                        fontWeight: FontWeight.w700,
                        shadows: const [
                          Shadow(color: Colors.black26, blurRadius: 8),
                        ],
                      ),
                    ),
                    if (subtitle != null && subtitle.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        textAlign: textAlignment,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: subtitleColor,
                          shadows: const [
                            Shadow(color: Colors.black26, blurRadius: 8),
                          ],
                        ),
                      ),
                    ],
                    if (buttonLabel != null && buttonLabel.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      DecoratedBox(
                        decoration: BoxDecoration(
                          color: _parseColor(banner.buttonColor, Colors.white),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          child: Text(
                            buttonLabel,
                            style: Theme.of(context).textTheme.labelLarge
                                ?.copyWith(
                                  color: _parseColor(
                                    banner.buttonTextColor,
                                    AppColors.ink,
                                  ),
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

Color _parseColor(String? value, Color fallback) {
  if (value == null || !RegExp(r'^#[0-9A-Fa-f]{6}$').hasMatch(value)) {
    return fallback;
  }
  return Color(int.parse(value.substring(1), radix: 16) | 0xFF000000);
}
