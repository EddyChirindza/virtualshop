# VirtualShop

Monorepo de uma loja virtual. O backend e a base de dados são partilhados pelas aplicações cliente e pelo painel administrativo.

A base de dados de desenvolvimento é o serviço PostgreSQL do Docker Compose. Não é necessário instalar nem usar uma PostgreSQL local; o projeto deve ligar-se sempre à base do serviço `db`.

## Começar com Docker

Requisitos: Docker Engine e Docker Compose v2 (`docker compose`). O Compose é a forma recomendada de iniciar a API, PostgreSQL e o Customer Web em conjunto.

```sh
# Na raiz do repositório
cp .env.example .env
```

Edite `.env` antes de iniciar. Substitua `DB_PASSWORD` e `JWT_SECRET` por valores privados e fortes; não partilhe nem commit esse ficheiro. Para criar um segredo aleatório pode usar `openssl rand -hex 32`.

```sh
# PostgreSQL, API (com migrations automáticas) e Customer Web
docker compose up --build -d

# Ver estado e logs
docker compose ps
docker compose logs -f backend
```

URLs locais:

| Serviço | URL |
|---|---|
| Customer Web (React) | http://localhost:8080 |
| API | http://localhost:3001/api |
| Health da API | http://localhost:3001/api/health |
| Readiness (inclui PostgreSQL) | http://localhost:3001/api/health/ready |
| PostgreSQL | `127.0.0.1:5437` no host (`DB_PORT_FORWARD`); não é exposto à rede |

O backend do Compose usa `db:5432` internamente. A partir do host, use a porta publicada `5437`; não use a porta `5432`, que pode pertencer a uma PostgreSQL local alheia ao projeto.

O painel administrativo React é opcional no Compose e fica disponível no perfil `admin`:

```sh
docker compose --profile admin up --build -d
```

- Admin React (`admin_web_2`) em http://localhost:8082.

O `VITE_API_URL` do Admin React e o `VITE_API_BASE_URL` do Customer Web são valores embutidos nos respectivos builds e devem ser URLs acessíveis pelo navegador. Os valores padrão servem para desenvolvimento local.

Comandos úteis:

```sh
docker compose logs -f                 # todos os serviços
docker compose logs -f db               # apenas PostgreSQL
docker compose restart backend          # reiniciar API
docker compose exec backend npm run seed # inserir dados definidos em backend/seed.sql
docker compose down                     # parar e remover containers/rede; preservar dados
docker compose down -v                  # APAGA a base de dados e uploads persistidos
```

As migrations pendentes correm ao iniciar o serviço `backend`. O volume `postgres_data` guarda a base de dados e `backend_uploads` guarda imagens de produtos e avatares. `docker compose down` preserva os volumes; só use `down -v` quando quiser eliminar os dados do Docker.

Este Compose destina-se a desenvolvimento local. Não publique estes serviços diretamente na Internet; para produção configure TLS, segredos de deployment, política de CORS e armazenamento persistente apropriado.

## Visão geral da estrutura

```text
virtual_shop/
├── app/
│   ├── customer_app/  Flutter/Dart para Android e iOS
│   ├── customer_web/  React + TypeScript + Vite para navegador
│   ├── admin_web_2.0/ React + TypeScript + Vite para o painel administrativo
│   └── delivery_app/  Flutter; actualmente contém apenas o ecrã de demonstração inicial
├── backend/           API REST Node.js/Express, migrations, seed e testes
├── docker-compose.yml PostgreSQL + API + Customer Web; perfil opcional admin
└── README.md
```

## Aplicações

### Customer App — `app/customer_app`

Aplicação móvel Flutter/Dart para Android e iOS. O código está organizado por funcionalidades:

- `auth`: login, registo, sessão e tokens.
- `products`, `categories`, `search`: catálogo, imagens, pesquisa e filtros.
- `cart`: carrinho remoto para clientes autenticados e suporte local no estado da app.
- `favorites`: favoritos sincronizados com a API.
- `profile`: perfil, endereços, password e estatísticas do cliente.
- `notifications`: notificações e promoções publicadas pelo backend.
- `home`: página inicial e preferências.
- `core`: Dio/API, erros, armazenamento seguro, providers e navegação.

A versão Web do cliente é independente e reside em `app/customer_web`; o Customer App Flutter destina-se aos dispositivos móveis.

### Customer Web — `app/customer_web`

Site React + TypeScript + Vite, servido no Compose em `http://localhost:8080`. Comunica directamente com os endpoints existentes do backend; a URL é configurada por `VITE_API_BASE_URL` (incluindo o sufixo `/api`). Também pode ser executado fora do Docker:

```sh
cd app/customer_web
cp .env.example .env.local
npm install
npm run dev
npm run build
npm run preview
```

O checkout disponível no backend cria uma encomenda, mas a API ainda não expõe histórico/listagem de encomendas nem contratos para gateways ou métodos de pagamento. A consulta de encomenda existente requer o respectivo número (`GET /orders/:id`).

### Admin Web — `app/admin_web_2.0`

Painel administrativo React + TypeScript que usa a mesma API e base PostgreSQL
do VirtualShop. Com a API em execução, configure a URL pública (incluindo
`/api`) e inicie o Vite:

```sh
cd app/admin_web_2.0
cp .env.example .env.local
npm ci
npm run dev
```

O exemplo aponta para `http://localhost:3001/api`; ajuste `VITE_API_URL` em
`.env.local` quando necessário. O painel usa access tokens em memória e cookie
HttpOnly para refresh. Não configure segredos no frontend. Em produção, permita
a origem do painel em `CORS_ORIGINS` e configure cookies seguros no backend.
Também pode ser servido pelo Compose em `http://localhost:8082` através de
`docker compose --profile admin up --build -d`; o URL da API é configurado por
`ADMIN_WEB_2_API_URL` no build. Consulte
[o README do painel React](./app/admin_web_2.0/README.md) para módulos
integrados, limitações de API e comandos de validação.

### Delivery App — `app/delivery_app`

O diretório existe como projecto Flutter, mas actualmente contém o ecrã contador de demonstração gerado pelo Flutter. Não há ainda fluxos de entregas nem integração com a API. Para abrir o projecto:

```sh
cd app/delivery_app
flutter pub get
flutter run
```

O Compose não inicia apps móveis: Android/iOS precisam de um emulador ou dispositivo. O Admin Web é servido separadamente como imagem Web React no perfil `admin` do Compose.

## Backend e API

`backend/` é uma API REST Node.js + Express com PostgreSQL. A API contém os módulos `auth`, `users`, `products`, `categories`, `cart`, `orders`, `favorites`, `notifications` e `admin`. Produtos e categorias de catálogo são públicos; operações de utilizador exigem autenticação e operações administrativas exigem o papel `admin`.

Rotas base: `/api/auth`, `/api/users`, `/api/products`, `/api/categories`, `/api/cart`, `/api/orders`, `/api/favorites`, `/api/notifications` e `/api/admin`. Health checks: `/api/health` e `/api/health/ready`.

As migrations SQL em `backend/migrations/` são numeradas e aplicadas uma vez pela tabela `schema_migrations`. A API serve imagens enviadas em `/uploads`; o Compose persiste estes ficheiros no volume `backend_uploads`.

Para executar a API localmente sem colocar Node no Docker, mantenha a base de dados no Docker e configure o backend para se ligar à porta publicada no host (`DB_HOST=localhost`, `DB_PORT=5437`). O `backend/.env` deve usar as mesmas credenciais (`DB_NAME`, `DB_USER`, `DB_PASSWORD`) que o `.env` da raiz. `backend/src/config/env.js` valida esses valores. As instruções principais de desenvolvimento são:

```sh
docker compose up -d db
cd backend
npm ci
npm run migrate
npm run dev
```

Não aponte o backend para uma PostgreSQL local na porta `5432`; a base do projeto é a do serviço `db`. Com a API fora do Compose, esta fica em `http://localhost:3000` por padrão.

### Testes do backend

```sh
cd backend
node --test tests/auth-validators.test.js tests/users-validators.test.js tests/notifications.validators.test.js
node --test tests/products-search.test.js tests/notifications.service.test.js
```

`tests/favorites.test.js` altera tabelas (limpa e insere fixtures). Execute-o somente contra uma base descartável dedicada, nunca contra dados de desenvolvimento partilhados ou produção.

## Flutter em Android/iOS

Instale Flutter, Android SDK e/ou Xcode conforme a plataforma. Use o endereço da API acessível ao runtime; no Android Emulator, `10.0.2.2` aponta para a máquina host:

```sh
# Android Emulator — executar Customer App
cd app/customer_app
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api

# Testes do Customer App
flutter test

# Build Android (APK)
flutter build apk --release --dart-define=API_BASE_URL=https://<host-da-api>/api

# Build iOS (macOS com Xcode)
flutter build ios --release --dart-define=API_BASE_URL=https://<host-da-api>/api
```

Para um dispositivo físico na mesma rede, troque `10.0.2.2` pelo IP LAN da máquina que executa a API. Para execução iOS, faça os comandos dentro de `app/customer_app` num Mac com Xcode configurado. Não use `localhost` dentro de um telefone físico para apontar ao computador.

## Variáveis e configuração

- `.env.example`: modelo de configuração para Docker Compose; copie para `.env` na raiz.
- `DB_HOST`, `DB_PORT`: ligação do backend à base do Docker quando o Node corre fora do Compose; no host, `localhost:5437`.
- `DB_PORT_FORWARD`: porta do PostgreSQL publicada pelo Compose no host (neste projeto, `5437`).
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`: credenciais da base PostgreSQL do serviço `db`, usadas pela API.
- `JWT_SECRET`: assinatura dos tokens; use um segredo aleatório privado.
- `VITE_API_BASE_URL`: URL pública da API para o bundle React.
- `VITE_API_URL`: URL pública da API para o painel React Admin Web 2.0.
- `ADMIN_WEB_2_API_URL`: URL pública da API embutida no build Docker do Admin React (`VITE_API_URL`).
- `CORS_ORIGINS`: origens web aceites pelo backend. Em desenvolvimento, o backend também permite origens localhost.
- `API_BASE_URL`: define a URL da API nas builds Flutter através de `--dart-define`.

Não coloque segredos em React/Vite ou em `--dart-define`: valores de frontend são incluídos nos artefactos entregues ao cliente. Não comite `.env`, tokens ou credenciais.

## Docker: configuração e diagnóstico

Validar o Compose sem iniciar containers:

```sh
docker compose --env-file .env.example config --quiet
docker compose --profile admin --env-file .env.example config --services
```

Se um build falhar, veja o log do serviço (`docker compose logs backend`, por exemplo). Para confirmar se a API e PostgreSQL estão prontos, consulte `/api/health/ready`. Para reiniciar o ambiente sem perder os dados, use `docker compose down` seguido de `docker compose up --build -d`.
