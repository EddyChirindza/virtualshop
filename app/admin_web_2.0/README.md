# VirtualShop Admin Web (React)

Painel administrativo React + TypeScript + Vite. Toda a leitura e escrita de
dados passa pela API Express existente; o browser não se liga directamente ao
PostgreSQL.

## Executar localmente

1. Inicie o PostgreSQL e a API conforme as instruções em
   [`backend/README.md`](../../backend/README.md). Por omissão, a API está em
   `http://localhost:3000/api`.
2. Na pasta `app/admin_web_2.0`, crie a configuração local a partir do exemplo:

   ```sh
   cp .env.example .env.local
   ```

   `VITE_API_URL` deve apontar para a API e incluir o prefixo `/api`. Não
   coloque passwords, segredos JWT ou refresh tokens nesta variável. O URL é
   público e fica incluído no bundle do frontend.
3. Instale dependências e inicie o Vite:

   ```sh
   npm ci
   npm run dev
   ```

   Abra o endereço indicado pelo Vite (normalmente `http://localhost:5173`).
   No desenvolvimento, o backend aceita origens `localhost`; em produção,
   configure `CORS_ORIGINS` com a origem exacta do painel.

Use uma conta existente cujo papel seja `admin`. Não existem credenciais
universais no repositório.

## Sessão administrativa

O painel envia o access token no cabeçalho `Authorization: Bearer ...` e
mantém-no apenas em memória. O refresh é feito através do cookie HttpOnly
emitido pelo backend; o Axios usa `withCredentials` para enviar/receber esse
cookie. Após recarregar a página, o painel tenta recuperar a sessão no endpoint
de refresh e valida o papel administrativo no servidor. O logout revoga a
sessão no backend.

Em produção, a origem do painel e as opções `AUTH_COOKIE_*` têm de ser
compatíveis com HTTPS, CORS com credenciais e a política `SameSite` escolhida.
Não altere a configuração da sessão para guardar refresh tokens no browser.

## Módulos ligados à API

- Dashboard: `/api/admin/dashboard`.
- Produtos: `/api/products`, detalhes por ID, operações de escrita para admin
  e upload através de `/api/admin/products/image`.
- Categorias: `/api/categories` (escrita apenas para admin).
- Encomendas: `/api/admin/orders`, detalhes, aceitação, rejeição e transições
  de estado validadas pelo backend.
- Clientes: `/api/admin/customers`.
- Notificações: listagem, criação e arquivo em `/api/admin/notifications`.

O backend não expõe actualmente endpoints administrativos para gestão de
contas de administradores, configuração da loja, histórico individual de
encomendas de clientes, estado activo de clientes, ou contagem/marcação como
lida de notificações administrativas. O painel não simula esses dados.

## Verificação

```sh
npm test
npm run lint
npm run build
```
