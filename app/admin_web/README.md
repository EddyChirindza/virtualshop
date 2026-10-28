# Admin Web

Painel administrativo implementado em Flutter. A documentação completa do monorepo, Docker e comandos está no [README da raiz](../../README.md#admin-web--appadmin_web).

Execução local em Chrome, a partir deste diretório:

```sh
flutter pub get
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:3000/api
```

Também pode ser compilado e servido pelo Docker Compose usando `docker compose --profile admin up --build -d` a partir da raiz. Use uma conta de administrador configurada no seu ambiente; não mantenha credenciais em ficheiros versionados.
