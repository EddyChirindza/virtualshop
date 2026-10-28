import 'package:flutter/material.dart';

import '../models/product.dart';
import 'product_image.dart';

/// Displays a product's images with swipe navigation and position indicators.
/// Compact mode fits into a product card's fixed image area.
class ProductImageCarousel extends StatefulWidget {
  const ProductImageCarousel({
    super.key,
    required this.images,
    this.compact = false,
    this.aspectRatio = 4 / 3,
  });

  final List<String> images;
  final bool compact;
  final double aspectRatio;

  factory ProductImageCarousel.forProduct(
    Product product, {
    Key? key,
    bool compact = false,
  }) =>
      ProductImageCarousel(key: key, images: product.images, compact: compact);

  @override
  State<ProductImageCarousel> createState() => _ProductImageCarouselState();
}

class _ProductImageCarouselState extends State<ProductImageCarousel> {
  final _controller = PageController();
  int _current = 0;

  @override
  void didUpdateWidget(covariant ProductImageCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_current >= widget.images.length) {
      _current = 0;
      if (_controller.hasClients) _controller.jumpToPage(0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Widget _pager() => Stack(
    fit: StackFit.expand,
    children: [
      PageView.builder(
        controller: _controller,
        itemCount: widget.images.isEmpty ? 1 : widget.images.length,
        onPageChanged: (index) => setState(() => _current = index),
        itemBuilder: (context, index) => ProductImage(
          url: widget.images.isEmpty ? null : widget.images[index],
        ),
      ),
      if (!widget.compact && widget.images.length > 1) ...[
        Align(
          alignment: Alignment.centerLeft,
          child: IconButton.filledTonal(
            tooltip: 'Imagem anterior',
            onPressed: _current > 0
                ? () => _controller.previousPage(
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOut,
                  )
                : null,
            icon: const Icon(Icons.chevron_left),
          ),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: IconButton.filledTonal(
            tooltip: 'Imagem seguinte',
            onPressed: _current < widget.images.length - 1
                ? () => _controller.nextPage(
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOut,
                  )
                : null,
            icon: const Icon(Icons.chevron_right),
          ),
        ),
      ],
    ],
  );

  Widget _indicators(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 8),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(
        widget.images.length,
        (index) => Semantics(
          label: 'Imagem ${index + 1} de ${widget.images.length}',
          selected: index == _current,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: widget.compact
                ? (index == _current ? 7 : 4)
                : (index == _current ? 9 : 7),
            height: widget.compact
                ? (index == _current ? 7 : 4)
                : (index == _current ? 9 : 7),
            margin: EdgeInsets.symmetric(horizontal: widget.compact ? 1 : 3),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: index == _current
                  ? Theme.of(context).colorScheme.primary
                  : Theme.of(context).colorScheme.outlineVariant,
            ),
          ),
        ),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: widget.compact ? MainAxisSize.max : MainAxisSize.min,
    children: [
      if (widget.compact)
        Expanded(child: _pager())
      else
        AspectRatio(aspectRatio: widget.aspectRatio, child: _pager()),
      if (widget.images.length > 1) _indicators(context),
    ],
  );
}
