import 'package:customer_app/core/constants/api_constants.dart';
import 'package:customer_app/features/payment_methods/data/payment_method_repository.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('uses the authenticated payment method endpoints', () async {
    final requests = <RequestOptions>[];
    final dio = Dio(BaseOptions(baseUrl: 'https://example.test'))
      ..interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            requests.add(options);
            final path = options.path;
            final method = options.method;
            dynamic data;
            if (path == ApiConstants.userPaymentMethods && method == 'GET') {
              data = {
                'data': [
                  {
                    'id': 1,
                    'type': 'mpesa',
                    'phone': '+258841234567',
                    'isDefault': true,
                  },
                  {
                    'id': 2,
                    'type': 'visa',
                    'card_last4': '1111',
                    'expiry_month': 12,
                    'expiry_year': 2028,
                  },
                ],
              };
            } else if (path == ApiConstants.userPaymentMethods) {
              data = {
                'data': {
                  'id': 3,
                  'type': 'mpesa',
                  'phone': '+258841234567',
                  'isDefault': false,
                },
              };
            } else if (path == ApiConstants.userPaymentMethod(2)) {
              data = {
                'data': {
                  'id': 2,
                  'type': 'visa',
                  'card_last4': '1111',
                  'expiry_month': 6,
                  'expiry_year': 2029,
                },
              };
            } else if (path == ApiConstants.userPaymentMethodDefault(1)) {
              data = {
                'data': {
                  'id': 1,
                  'type': 'mpesa',
                  'phone': '+258841234567',
                  'isDefault': true,
                },
              };
            } else {
              data = {
                'data': {'deleted': true},
              };
            }
            handler.resolve(
              Response<dynamic>(requestOptions: options, data: data),
            );
          },
        ),
      );
    final repository = PaymentMethodRepository(dio: dio);

    final methods = await repository.fetchPaymentMethods();
    await repository.createPaymentMethod({'type': 'mpesa', 'phone': '841234567'});
    await repository.updatePaymentMethod(2, {'expiryMonth': 6});
    await repository.setDefaultPaymentMethod(1);
    await repository.deletePaymentMethod(3);

    expect(methods, hasLength(2));
    expect(methods.first.maskedValue, '•••• 4567');
    expect(methods.last.maskedValue, '•••• 1111 · 12/28');
    expect(requests[0].method, 'GET');
    expect(requests[0].path, ApiConstants.userPaymentMethods);
    expect(requests[1].method, 'POST');
    expect(requests[1].data, {'type': 'mpesa', 'phone': '841234567'});
    expect(requests[2].method, 'PATCH');
    expect(requests[2].path, ApiConstants.userPaymentMethod(2));
    expect(requests[3].path, ApiConstants.userPaymentMethodDefault(1));
    expect(requests[4].method, 'DELETE');
    expect(requests[4].path, ApiConstants.userPaymentMethod(3));
  });
}
