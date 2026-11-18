import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/banner_repository.dart';
import '../models/store_banner.dart';

final bannerRepositoryProvider = Provider<BannerRepository>((ref) {
  return BannerRepository(dio: ref.watch(dioProvider));
});

final bannersProvider = FutureProvider<List<StoreBanner>>((ref) {
  return ref.watch(bannerRepositoryProvider).fetchPublic();
});
