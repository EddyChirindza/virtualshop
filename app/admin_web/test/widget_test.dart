import 'package:admin_web/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('mostra o ecrã de login ao arrancar', (tester) async {
    await tester.pumpWidget(const VirtualShopAdminApp());

    expect(find.text('Bem-vindo de volta'), findsOneWidget);
    expect(find.text('Entrar no painel'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
  });

  testWidgets('valida os campos obrigatórios do login', (tester) async {
    await tester.pumpWidget(const VirtualShopAdminApp());

    await tester.tap(find.text('Entrar no painel'));
    await tester.pump();

    expect(find.text('Introduz o teu telefone ou email.'), findsOneWidget);
    expect(find.text('Introduz a tua palavra-passe.'), findsOneWidget);
  });

  testWidgets('alterna a visibilidade da palavra-passe', (tester) async {
    await tester.pumpWidget(const VirtualShopAdminApp());

    expect(find.byIcon(Icons.visibility_outlined), findsOneWidget);
    await tester.tap(find.byIcon(Icons.visibility_outlined));
    await tester.pump();

    expect(find.byIcon(Icons.visibility_off_outlined), findsOneWidget);
  });
}
