import 'package:admin_web/core/constants/api_constants.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ApiConstants.resolveImageUrl', () {
    test('mantém URLs absolutas', () {
      expect(
        ApiConstants.resolveImageUrl('https://cdn.example.com/products/a.png'),
        'https://cdn.example.com/products/a.png',
      );
      expect(
        ApiConstants.resolveImageUrl('http://localhost:3000/uploads/a.png'),
        'http://localhost:3000/uploads/a.png',
      );
    });

    test('resolve caminhos absolutos a partir da raiz', () {
      expect(
        ApiConstants.resolveImageUrl('/uploads/products/a.png'),
        'http://localhost:3000/uploads/products/a.png',
      );
    });

    test('resolve caminhos relativos sem barra inicial', () {
      expect(
        ApiConstants.resolveImageUrl('uploads/products/a.png'),
        'http://localhost:3000/uploads/products/a.png',
      );
    });
  });
}
