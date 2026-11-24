import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/screens/login_screen.dart';
import 'session/session_controller.dart';

Future<bool> requireAuthentication(
  BuildContext context,
  WidgetRef ref, {
  required String message,
}) async {
  if (ref.read(sessionControllerProvider).isActive) return true;
  await Navigator.of(
    context,
  ).push(MaterialPageRoute<void>(builder: (_) => LoginScreen(reason: message)));
  return ref.read(sessionControllerProvider).isActive;
}
