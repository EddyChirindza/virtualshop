# Desenvolvimento local do VirtualShop

## Arquitectura e portas

O Admin React corre no host com Vite. A API Express e o PostgreSQL correm em
Docker Compose e comunicam pela rede interna do Compose; o browser acede à API
através da porta publicada no host.

| Serviço | Porta interna | Porta no host | Endereço |
|---|---:|---:|---|
| PostgreSQL (`db`) | 5432 | 5437 | `localhost:5437` |
| Backend Express (`backend`) | 3000 | 3001 | `http://localhost:3001` |
| Admin React (Vite) | 5173 | 5173 | `http://localhost:5173` |

O nome de host PostgreSQL visto pelo backend é `db`, na porta `5432`. Não use
`localhost` para a ligação do backend à base de dados. A base de dados
configurada neste ambiente é `virtualshop_db`; o volume `postgres_data` é
persistente.

Em alternativa ao Vite no host, o Admin React pode ser servido pelo Compose no
perfil `admin`, em `http://localhost:8082`:

```sh
docker compose --profile admin up --build -d admin_web_2
```

O URL da API é embutido no build por `ADMIN_WEB_2_API_URL`
(predefinição: `http://localhost:3001/api`).

## Variáveis de ambiente

O Docker Compose lê o `.env` da raiz do projecto. Este ficheiro deve conter as
credenciais locais exigidas pelo Compose, sem as guardar no Git. Preserve o
nome `virtualshop_db` e a configuração existente da base persistente.
`DB_PORT_FORWARD=5437` publica a porta do PostgreSQL sem ocupar a porta
predefinida `5432` do host.
`DB_PASSWORD` tem de corresponder à password já válida para o utilizador
PostgreSQL inicializado no volume existente. Alterar a variável de ambiente
não altera a password dentro de uma base já inicializada; não a rode sem uma
operação explícita de alteração na própria PostgreSQL.

O Admin React usa `app/admin_web_2.0/.env`. Crie-o a partir de
`.env.example` quando ainda não existir; a configuração local deve ser:

```dotenv
VITE_API_URL=http://localhost:3001/api
```

O URL da API é público e pode integrar o bundle do frontend. Não coloque nele
passwords, tokens ou segredos. A configuração Axios permanece centralizada em
`src/lib/api/client.ts`.

O backend do Compose escuta em `0.0.0.0:3000`, usa `DB_HOST=db` e `DB_PORT=5432`,
e publica `3001:3000` apenas no loopback do host. Em desenvolvimento, a política
CORS do backend permite origens localhost; mantenha também
`http://localhost:5173` em `CORS_ORIGINS`.

## Iniciar os serviços

Verifique primeiro a configuração e os serviços existentes:

```sh
docker compose config --quiet
docker compose ps
docker volume ls
```

Inicie PostgreSQL e backend:

```sh
docker compose up -d db backend
docker compose ps
```

O comando de arranque do backend executa `npm run migrate` antes do servidor.
Antes de recriar ou iniciar o backend numa base persistente, reveja as migrations
pendentes. A migration `019_link_refresh_tokens_to_sessions.sql` bloqueia
tabelas de autenticação e altera associações de tokens existentes; aplique-a
apenas numa janela de manutenção apropriada.

Neste ambiente, `virtualshop_db` tem 17 migrations aplicadas e as migrations
018 e 019 pendentes. O backend actualmente em execução foi iniciado sem executar
migrations para preservar esse estado. Um `docker compose up` que recrie o
backend com a configuração normal executará as migrations pendentes; não o faça
até a aplicação de 018/019 estar autorizada.

Inicie o Admin React num terminal separado:

```sh
cd app/admin_web_2.0
npm run dev -- --host 127.0.0.1 --port 5173
```

Abra `http://localhost:5173/login`.

## Verificar saúde e conectividade

Verifique o estado dos containers e a disponibilidade do PostgreSQL:

```sh
docker compose ps
docker compose exec db sh -lc \
  'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose exec db sh -lc \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT current_database()"'
```

Os dois pedidos seguintes distinguem liveness de readiness: o segundo também
confirma uma consulta à base de dados.

```sh
curl -i http://localhost:3001/api/health
curl -i http://localhost:3001/api/health/ready
```

Confirme que um endpoint protegido chega ao middleware de autenticação:

```sh
curl -i http://localhost:3001/api/admin/customers
```

Sem credenciais, é esperado `401`; isso confirma conectividade e não é uma falha
de rede. No browser, a origem deve ser `http://localhost:5173` e os pedidos API
devem usar `http://localhost:3001/api`.

## Conflitos de portas

Inspeccione listeners antes de iniciar serviços; não termine processos
automaticamente:

```sh
ss -ltnp | grep -E ':(3000|3001|5173|5432|5437)\b'
docker compose ps
```

Se `3001` estiver ocupado, identifique o processo e escolha uma porta livre
para a publicação do backend; actualize igualmente `VITE_API_URL` e os URLs
externos passados como build args no Compose. A porta interna Express continua
a ser `3000`, e a ligação Docker backend→PostgreSQL continua em `db:5432`.
Não altere a porta PostgreSQL interna para resolver conflitos do host.

## Logs

```sh
docker compose logs --tail=100 backend
docker compose logs --tail=100 db
```

Os logs podem conter informação operacional; não os publique sem verificar que
não incluem dados sensíveis.

## Preservar os dados

Confirme o volume persistente antes de operações sobre containers:

```sh
docker volume inspect virtual-shop_postgres_data
```

`docker compose stop` e a recriação apenas do serviço backend preservam os
volumes. Não use `docker compose down -v`, `docker volume rm` ou
`docker system prune --volumes`. Não recrie a base, limpe tabelas ou execute
seeds para resolver problemas de conectividade. Testes de integração que
escrevam dados devem usar uma base isolada, previamente confirmada como base de
testes.
