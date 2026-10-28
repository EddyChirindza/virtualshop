# Customer App (Flutter)

Aplicação móvel Android/iOS. Para estrutura do monorepo, inicialização da API/Docker, módulos e todos os comandos, consulte o [README principal](../../README.md#customer-app--appcustomer_app).

```sh
flutter pub get

# Android Emulator
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api

# Testes
flutter test
```

Para um dispositivo físico, use o IP da máquina que executa a API em vez de `10.0.2.2`. A aplicação Web do cliente é a implementação React independente em `app/customer_web`.
