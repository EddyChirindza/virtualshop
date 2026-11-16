# Customer App (Flutter)

Aplicação móvel Android/iOS. Para estrutura do monorepo, inicialização da API/Docker, módulos e todos os comandos, consulte o [README principal](../../README.md#customer-app--appcustomer_app).

```sh
flutter pub get

# Android Emulator
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api

# Testes
flutter test
```

Com o Docker Compose, a API é publicada na porta `3001` do host. Se iniciares o backend diretamente no host, usa a porta `3000`:

```sh
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api
```

Num dispositivo físico, substitui `10.0.2.2` pelo IP da máquina que executa a API e mantém a porta correspondente ao modo de execução (`3001` no Compose ou `3000` no backend local). A aplicação Web do cliente é a implementação React independente em `app/customer_web`.

## Android release

O build release exige HTTPS e uma keystore própria. Sem `android/key.properties`, o Gradle falha em vez de assinar com a chave de debug.

```sh
cp android/key.properties.example android/key.properties
# preencher android/key.properties (o ficheiro e a keystore estão no .gitignore)

flutter build apk --release \
  --dart-define=API_BASE_URL=https://api.virtualshop.co.mz/api
```

`HTTP` só é permitido nos manifests de `debug`/`profile`, para desenvolvimento local.
