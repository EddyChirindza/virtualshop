import 'package:customer_app/features/profile/domain/models/profile.dart';
import 'package:customer_app/features/profile/domain/models/profile_address.dart';
import 'package:customer_app/features/profile/domain/models/profile_stats.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Profile models', () {
    test('maps user fields including verification and date of birth', () {
      final profile = Profile.fromJson({
        'id': 14,
        'full_name': 'Ana Mucavele',
        'email': 'ana@example.com',
        'phone': '+258841234567',
        'photo_url': 'https://example.com/avatar.png',
        'is_verified': true,
        'date_of_birth': '1995-04-12',
        'gender': 'Feminino',
      });

      expect(profile.id, 14);
      expect(profile.fullName, 'Ana Mucavele');
      expect(profile.isVerified, isTrue);
      expect(profile.dateOfBirth, DateTime(1995, 4, 12));
      expect(profile.photoUrl, 'https://example.com/avatar.png');
    });

    test('maps totals and preserves a missing average rating', () {
      final stats = ProfileStats.fromJson({
        'total_orders': '12',
        'total_spent': '8450.50',
        'average_rating': null,
        'favorites_count': 7,
      });

      expect(stats.totalOrders, 12);
      expect(stats.totalSpent, 8450.5);
      expect(stats.averageRating, isNull);
      expect(stats.favoritesCount, 7);
    });

    test('summarizes address parts and handles default flag', () {
      final address = ProfileAddress.fromJson({
        'id': 2,
        'label': 'Casa',
        'province': 'Maputo',
        'city': 'Maputo',
        'neighborhood': 'Polana',
        'street': 'Av. Julius Nyerere',
        'number': '125',
        'is_default': true,
      });

      expect(address.isDefault, isTrue);
      expect(
        address.summary,
        'Polana, Av. Julius Nyerere, 125, Maputo, Moçambique',
      );
    });
  });
}