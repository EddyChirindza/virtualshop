import 'package:customer_app/core/session/session_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('guest mode is distinct from an authenticated session', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final controller = container.read(sessionControllerProvider.notifier);
    controller.enterGuestMode();

    final guest = container.read(sessionControllerProvider);
    expect(guest.isGuest, isTrue);
    expect(guest.isActive, isFalse);
    expect(guest.canBrowse, isTrue);
  });

  test('authenticated session replaces guest mode', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final controller = container.read(sessionControllerProvider.notifier);
    controller.enterGuestMode();
    controller.beginSession(42);

    final session = container.read(sessionControllerProvider);
    expect(session.isGuest, isFalse);
    expect(session.isActive, isTrue);
    expect(session.userId, 42);
  });

  test('leaving guest mode removes browsing-only state', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final controller = container.read(sessionControllerProvider.notifier);
    controller.enterGuestMode();
    controller.exitGuestMode();

    final session = container.read(sessionControllerProvider);
    expect(session.isGuest, isFalse);
    expect(session.isActive, isFalse);
  });
}
