import 'package:flutter/material.dart';

import '../../../core/constants/api_constants.dart';
import '../../../theme/app_theme.dart';

/// Imagem de produto com placeholder quando não há URL, enquanto carrega,
/// ou quando o download falha (ex: as URLs de exemplo do seed.sql).
class ProductImage extends StatelessWidget {
  const ProductImage({super.key, required this.url, this.fit = BoxFit.cover});

  final String? url;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final placeholder = ColoredBox(
      color: AppColors.imagePlaceholder,
      child: Center(
        child: Icon(
          Icons.shopping_basket_outlined,
          size: 36,
          color: AppColors.imagePlaceholderIcon,
        ),
      ),
    );

    final imagePath = url;
    if (imagePath == null || imagePath.isEmpty) return placeholder;

    return Image.network(
      ApiConstants.resolveImageUrl(imagePath),
      fit: fit,
      width: double.infinity,
      height: double.infinity,
      errorBuilder: (context, error, stackTrace) => placeholder,
      loadingBuilder: (context, child, progress) =>
          progress == null ? child : placeholder,
    );
  }
}
