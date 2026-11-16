# Auditoria comparativa: Admin Flutter, Admin React 2.0 e backend

**Data da auditoria:** 5 de Novembro de 2026  
**Âmbito:** `app/admin_web`, `app/admin_web_2.0` e `backend` no estado actual do workspace.  
**Alterações:** apenas este relatório foi criado. O workspace já tinha alterações locais em três ficheiros do React 2.0; foram preservadas e a auditoria considerou o conteúdo presente no workspace.

> **Atualização (5 de Novembro de 2026):** a gestão de administradores foi implementada no backend e ligada ao React 2.0, e o Admin React 2.0 passou a ter imagem Docker e serviço no Compose. As referências abaixo a administradores como “placeholder” ou “INEXISTENTE” descrevem o estado original auditado.

## Conclusão executiva

O React 2.0 já está ligado aos endpoints existentes para dashboard, catálogo, categorias, clientes (lista), encomendas (lista/detalhe/acções) e notificações (consulta/criação/arquivo). Produtos e categorias têm operações de escrita efectivas; as páginas de encomendas e notificações também fazem chamadas reais à API.

As lacunas de migração mais concretas são:

1. **Detalhe de encomenda incompleto no React:** o backend devolve morada, método de pagamento, cupão, subtotal, desconto e taxa de entrega; o React não os apresenta. O Flutter apresenta esses dados.
2. **Filtros por data de encomenda ausentes no React:** Flutter e backend suportam `from`/`to`; a API React não os envia.
3. **Notificação associada à criação de produto ausente no React:** o Flutter oferece a publicação automática de uma notificação com `product_id`; o endpoint já existe.
4. **Opções de notificações incompletas no React:** não envia `product_id`, `starts_at` ou `expires_at`, embora o Flutter use associação a produto e validade e o backend aceite estes campos.
5. **Detalhe de cliente ausente no React:** o Flutter abre um diálogo com dados que já vêm em `GET /admin/customers`; o React só apresenta a tabela. Não é necessário criar endpoint para reproduzir esse diálogo básico.
6. **Gestão administrativa de clientes, administradores e definições de loja:** não há implementação administrativa correspondente no Flutter nem endpoints administrativos equivalentes no backend. As páginas React de administradores e definições são, respectivamente, um placeholder e uma interface desactivada.

Não foi encontrado um módulo Flutter funcional de edição de definições, gestão de administradores, gestão CRUD de clientes ou edição de perfil. A entrada Flutter “Definições” é inactiva e o nome “Administrador” no dashboard tem um TODO para ligar dados reais; não devem ser tratados como funcionalidades migradas ou em funcionamento.

## Critérios de classificação

- **MIGRADA:** interface React ligada à API e operação funcional.
- **NÃO MIGRADA:** funcionalidade do Flutter, suportada pelo backend, mas ausente no React.
- **PARCIAL:** existe integração ou interface React, mas falta comportamento/dados relevantes.
- **BACKEND ALTERADO:** existia no Flutter, mas a rota ou o contrato esperado já não está disponível ou mudou.
- **INEXISTENTE:** não foi identificada implementação funcional nos três componentes. Uma página placeholder não conta como implementação.

## Matriz comparativa

| Funcionalidade | Flutter | Backend actual | React 2.0 | Situação |
|---|---|---|---|---|
| Autenticação, sessão e logout | Login por identificador/telefone e password; valida `user.role == admin`; sessão com refresh e logout. `AdminAuthRepository.login`; `AdminSession`; `AdminApi`. | `POST /api/auth/login`, `/refresh`, `/logout` e `GET /api/auth/me`. O login/refresh aceitam `adminOnly`; a middleware `requireRole('admin')` protege as rotas administrativas. | Login envia `adminOnly: true`; restaura sessão e obtém o utilizador em `/auth/me`; logout e refresh implementados. | **MIGRADA** |
| Dashboard, indicadores e relatórios operacionais | `GET /admin/dashboard?period=...`; períodos 7/30/90 dias; receita, encomendas, pendentes, clientes, série diária, encomendas recentes e produtos com stock baixo. | `GET /api/admin/dashboard`; `adminService.getDashboard` calcula os indicadores e a série de receita. A rota exige admin. | `adminApi.getDashboard`; o dashboard consulta os mesmos períodos e apresenta indicadores, gráfico, encomendas recentes e lista de stock baixo. | **MIGRADA** |
| Consulta e pesquisa de produtos | Lista paginada, pesquisa `q`, ordenação `newest`, limite 50; categorias consultadas em separado. `CatalogRepository.listProducts/listCategories`. | `GET /api/products` e `GET /api/categories` são públicos; listagem suporta `q`, `category`, `page`, `limit`, `sort` e outros filtros. Resposta de produtos inclui metadados de paginação. | Consulta `GET /products` com pesquisa/categoria/página; lista categorias; apresenta paginação. | **MIGRADA** |
| Criar, editar e eliminar produtos; imagens e stock | `POST/PATCH/DELETE /products`; upload para `/admin/products/image`; formulário envia nome, descrição, preço, stock, imagens, categoria e flags `is_popular`/`is_new_arrival`. | `product.routes` restringe escrita a admin; `product.validators` valida os campos; `product.service` implementa CRUD e gestão de imagens referenciadas. Upload implementado em `admin/product_image.service`. | `ProductsPage` chama `createProduct`, `updateProduct`, `deleteProduct` e `uploadProductImage`; formulários e upload múltiplo estão ligados. Ao seleccionar novos ficheiros, o React substitui as imagens anteriores; o Flutter adiciona os novos URLs às imagens já seleccionadas. | **MIGRADA** para CRUD; **PARCIAL** na equivalência do fluxo de imagens |
| Notificação automática ao criar produto | O formulário Flutter permite notificar os clientes e chama `createProductNotification` após criar o produto; envia tipo `new_product`, `product_id`, estado `published` e `idempotency_key`. | `POST /api/admin/notifications`; `createNotificationSchema` aceita produto e chave idempotente; `createByAdmin` persiste e trata a chave idempotente. | O formulário de `ProductsPage` cria o produto, mas não chama `createNotification` nem apresenta a opção de notificar. | **NÃO MIGRADA** |
| Categorias: consulta, criação, edição e eliminação | `GET/POST/PATCH/DELETE /categories`; formulário inclui nome, slug, ícone e categoria principal. `CategoriesScreen`. | `category.routes` permite leitura e restringe escrita a admin; controller valida; `category.service` implementa CRUD e impede ciclos, eliminação de categorias com filhos/produtos. | `CategoriesPage` e `adminApi` fazem consulta e CRUD reais, invalidando as queries após alterações. | **MIGRADA** |
| Lista de clientes | `GET /admin/customers`; carrega nome, email, telefone, imagem e data de registo. Sem pesquisa ou paginação na UI Flutter. | `GET /api/admin/customers`, protegido por admin; `adminService.getCustomers` devolve `id`, `fullName`, `email`, `phone`, `avatarUrl` e `createdAt`. Sem paginação/filtro no endpoint. | `CustomersPage` consulta o endpoint e permite pesquisa local por nome, email ou telefone; apresenta nome, email, telefone e data. | **MIGRADA** |
| Detalhe individual básico do cliente | Toque abre diálogo com imagem, ID, nome, email, telefone e data de registo; todos estes dados são obtidos da lista. | O endpoint de lista já fornece os dados necessários ao diálogo básico. Não foi encontrada rota administrativa de detalhe. | A tabela não abre detalhe e não apresenta imagem nem ID como detalhe. A integração existente pode ser reutilizada; não requer endpoint novo para os campos já fornecidos. | **PARCIAL** |
| Moradas, perfil completo e histórico do cliente vistos por admin | Não foi encontrada uma página Flutter administrativa para moradas, alteração de conta ou histórico individual de encomendas. O diálogo limita-se aos dados básicos. | `GET/PATCH /api/users/me`, `/me/addresses` e operações de moradas são sempre limitados ao `req.user.id`; não permitem seleccionar outro cliente. As encomendas administrativas devolvem alguns dados do cliente apenas no contexto de uma encomenda. Não existe `GET /admin/customers/:id` nem endpoint administrativo de moradas/histórico. | Não consulta perfil, moradas ou histórico de encomendas a partir da página de clientes. | **INEXISTENTE** como função administrativa; a API de perfil existente é self-service |
| Pesquisa, estado, paginação e datas de encomendas | `GET /admin/orders` com `status`, `search`, `from`, `to`, `page`, `limit`; a UI oferece pesquisa, estado, intervalo de datas e detalhe. | `listOrdersQuerySchema` e `listOrdersForAdmin` implementam todos estes filtros; `from`/`to` são datas ISO `YYYY-MM-DD`. | React envia `status`, `search`, `page`, `limit`; paginação e pesquisa/estado funcionam. Não envia `from` nem `to` e não tem controlos de data. | **PARCIAL**; intervalo de datas **NÃO MIGRADO** |
| Detalhe de encomenda e dados de entrega/pagamento | `GET /admin/orders/:id`; apresenta cliente, itens, método/estado de pagamento, método e morada de entrega, notas, cupão, subtotal, desconto, taxa e total. | `getOrderForAdmin` usa `ADMIN_ORDER_SELECT` e devolve `address`, `paymentMethod`, `couponCode`, `subtotal`, `discount`, `deliveryFee`, cliente e itens. | Consulta detalhe real, mas `AdminOrder`/`OrderDetails` omitem morada, método de pagamento, cupão, subtotal, desconto e taxa de entrega; apresentam pagamento apenas como estado e entrega apenas como tipo. | **PARCIAL** |
| Aceitar, rejeitar e actualizar estado de encomendas | `POST /admin/orders/:id/accept`, `POST .../:id/reject` com `{reason}`, `PATCH .../:id/status` com `{status}`; confirma acções e actualiza a interface. | Endpoints protegidos pela rota admin; validações de motivo/estado; `transitionOrder` aplica transições permitidas, verifica pagamento, repõe stock em rejeição/cancelamento e gera notificação ao cliente. | `OrdersPage` chama as três operações e actualiza a query/cache; erro da API é apresentado. | **MIGRADA** |
| Lista, criação e arquivo de notificações | `GET /admin/notifications?page=1&limit=50`; cria e arquiva. Formulário permite tipo, publicação, `product_id` opcional e `expires_at`; destinatário é “todos os clientes”. | Rotas admin em `/api/admin/notifications`; listagem paginada, criação e arquivo implementados. Schema aceita `product_id`, `recipient_scope`, `recipient_user_id`, `status`, `starts_at`, `expires_at` e idempotência. | Consulta com paginação, cria rascunho/publicada e arquiva; os três caminhos chamam API real. | **MIGRADA** para operações comuns |
| Opções avançadas de notificações | Suporta validade (`expires_at`) e associação a produto; não oferece `starts_at` nem destinatário individual. | Criação suporta `product_id`, `starts_at`, `expires_at` e destinatário `all_customers` ou `user`. | `NotificationFields` e formulário não enviam `product_id`, `starts_at` ou `expires_at`. O formulário oferece destinatário individual (além do fluxo Flutter), mas não tem opção visual `order_update`, apesar de o backend aceitá-la. Filtro de estado é local à página carregada, não um filtro do endpoint. | **PARCIAL**; validade e associação a produto **NÃO MIGRADAS** |
| Marcar notificações como lidas/contador de não lidas no painel admin | Não encontrado no painel Flutter administrativo. | `/api/notifications` está protegido por `requireRole('customer')`; oferece leitura e contador para clientes, não para administradores. | Não implementado; a própria página informa a ausência de estado de leitura admin. | **INEXISTENTE** no âmbito administrativo (não é lacuna de migração Flutter) |
| Gestão CRUD de clientes, estado da conta e permissões | Não encontrada no Flutter administrativo. | Não existem rotas administrativas de CRUD/estado de clientes; `/api/users/me` altera apenas o utilizador autenticado. | Não implementada. `CustomersPage` é consulta; não tem mutações. | **INEXISTENTE** |
| Gestão de utilizadores administradores | Não encontrada no Flutter. | Não existem rotas/services de listagem, criação, alteração ou desactivação de administradores. A role admin é usada como controlo de acesso, não como módulo de gestão. | `/administrators` apresenta apenas os dados da sessão e uma tabela placeholder sem API. | **INEXISTENTE** como gestão; interface React parcial/placeholder |
| Perfil do administrador e segurança da conta | O Flutter não tem perfil funcional; o dashboard contém um TODO para ligar o nome do administrador a dados reais. | `GET /api/auth/me` devolve o utilizador autenticado; `/api/users/me` permite actualizar o próprio perfil/fotografia/password e estatísticas, sempre para o titular do token. | Autenticação consulta `/auth/me` e a página Administradores mostra nome, email, telefone e role; não edita perfil, fotografia ou password. | **PARCIAL** (React acrescenta leitura; edição de perfil não foi migrada/ligada) |
| Definições da loja e preferências | A entrada “Definições” do Flutter é inactiva; não há ecrã nem chamadas de API. | Não foram encontradas rotas/services de configuração da loja, contactos, moeda, fuso horário ou preferências de notificação do painel. | `SettingsPage` contém campos desactivados e indica integração pendente; não consome API. | **INEXISTENTE** (página visual sem operação) |

## Evidências e contratos por componente

### Admin Flutter antigo

O ponto de entrada `app/admin_web/lib/main.dart` compõe login e dashboard e instancia seis repositories. As páginas acessíveis no dashboard são dashboard, clientes, encomendas, produtos, categorias e notificações. Os repositories são:

- `features/auth/data/admin_auth_repository.dart` — `POST /auth/login` com `{identifier, password}`; lê `data.user`, `data.token` e `data.refreshToken`; rejeita localmente utilizadores cuja role não seja `admin`.
- `features/dashboard/data/dashboard_repository.dart` — `GET /admin/dashboard?period=...`; espera `data` com `metrics`, `revenueSeries`, `recentOrders` e `lowStockProducts`.
- `features/customers/data/customers_repository.dart` — `GET /admin/customers`; model aceita `fullName/full_name`, email, telefone, URL de foto e data.
- `features/orders/data/orders_repository.dart` — lista com filtros/paginação, detalhe, aceitar, rejeitar com `{reason}` e alterar estado com `{status}`.
- `features/catalog/data/catalog_repository.dart` — consulta e CRUD de produtos/categorias, upload de imagem e publicação opcional de notificação de novo produto.
- `features/notifications/data/admin_notifications_repository.dart` — lista paginada, criação para todos os clientes com produto/validade opcionais e arquivo.

#### Inventário de chamadas Flutter

Os paths abaixo são relativos à base `http://localhost:3000/api` (configurável por `API_BASE_URL`). Os endpoints e contratos esperados pelo Flutter são:

| Método e endpoint | Query/payload enviado pelo Flutter | Resposta/uso esperado |
|---|---|---|
| `POST /auth/login` | `{identifier: phone, password}`; não envia `adminOnly`. | Envelope `data.user`, `data.token`, `data.refreshToken`; role verificada localmente como `admin`. |
| `POST /auth/refresh` | `{refreshToken}`. | Envelope `data.token` e `data.refreshToken`; sessão substitui ambos os tokens. |
| `POST /auth/logout` | `{refreshToken}`. | Logout da sessão; Flutter limpa estado local mesmo se a chamada falhar. |
| `GET /admin/dashboard` | `period` (`7d`, `30d` ou `90d`). | `data.metrics`, `revenueSeries`, `recentOrders`, `lowStockProducts`. |
| `GET /admin/customers` | Sem parâmetros. | `data` como lista (o parser também tolera contentores alternativos); cliente contém ID, nome, email, telefone, URL de foto e data de registo. |
| `GET /products` | `page`, `limit=50`, `sort=newest`, `q` opcional (trim). | `data` como lista de produtos e paginação `total`, `page`, `totalPages`; produto inclui imagens, categoria e flags de catálogo. |
| `GET /categories` | Sem parâmetros. | `data` como lista de categorias. |
| `POST /products` | Nome, descrição, preço, stock, `image_url`, `image_urls`, `category_id`, `is_popular`, `is_new_arrival`. | ID do produto criado lido do envelope/data; ausência de ID gera erro de formato. |
| `PATCH /products/:id` | Mesmo conjunto de campos para edição. | Resposta ignorada pela UI após sucesso; lista recarregada. |
| `DELETE /products/:id` | Sem payload. | Sucesso seguido de recarga da lista. |
| `POST /admin/products/image` | `{base64}` por imagem; envio repetido para múltiplas imagens. | `data.image_url`, acumulado no formulário para `image_urls`. |
| `POST /admin/notifications` (notificação de produto) | `{title, message, type:'new_product', product_id, status:'published', idempotency_key}`. | Resposta não consumida; erro é tratado separadamente do sucesso de criação do produto. |
| `POST /categories` | `{name, slug, icon_url, parent_id}`. | Resposta não consumida; categorias recarregadas. |
| `PATCH /categories/:id` | Campos de categoria `{name, slug, icon_url, parent_id}`. | Resposta não consumida; categorias recarregadas. |
| `DELETE /categories/:id` | Sem payload. | Sucesso seguido de recarga. |
| `GET /admin/orders` | `page`, `limit` (default 50), `status`, `search`, `from`, `to`; filtros opcionais são omitidos quando vazios. | `data` convertido em `AdminOrderPage`: `items`, `page`, `total`, `totalPages`. |
| `GET /admin/orders/:id` | ID na rota. | Envelope `data` convertido em detalhe `AdminOrder`, incluindo cliente, morada, pagamento, itens, totais, notas, cupão e motivo de rejeição. |
| `POST /admin/orders/:id/accept` | Sem payload. | `data` convertido em `AdminOrder`. |
| `POST /admin/orders/:id/reject` | `{reason}`. | `data` convertido em `AdminOrder`. |
| `PATCH /admin/orders/:id/status` | `{status}`. | `data` convertido em `AdminOrder`. |
| `GET /admin/notifications` | `page=1`, `limit=50`. | Espera envelope `data` como lista ou contentor `items`/`notifications`; campos usados incluem ID, título, mensagem, tipo, estado e data. |
| `POST /admin/notifications` (formulário geral) | `{title, message, type, status, recipient_scope:'all_customers'}`; `product_id` e `expires_at` opcionais. | Resposta não consumida; lista recarregada. |
| `PATCH /admin/notifications/:id/archive` | Sem payload. | Sucesso seguido de recarga da lista. |

`features/orders/models/admin_order.dart` confirma que o Flutter interpreta os campos de endereço, pagamento, cupão, itens e totais. `features/customers/presentation/screens/customers_screen.dart` confirma que o detalhe do cliente é apenas um diálogo com os dados retornados pela lista; não é uma operação de consulta de moradas ou histórico.

A navegação tem uma entrada “Definições”, mas é um `_NavItem` sem acção. O dashboard continua a apresentar o nome literal “Administrador” e contém TODO para obter a identidade real. Não foi encontrado módulo de gestão de administradores nem de perfil.

### Admin React 2.0

`src/app/router/AppRouter.tsx` declara as rotas de dashboard, encomendas, produtos, categorias, clientes, administradores, notificações e definições. A presença de uma rota não prova integração: `AdministratorsPage` usa `DataTablePlaceholder` para gestão e `SettingsPage` desactiva os campos.

As integrações funcionais estão centralizadas em `src/features/admin/adminApi.ts`. As páginas de dashboard, produtos, categorias, encomendas e notificações usam queries/mutations reais. `CustomersPage` consulta `adminApi.listCustomers`, mas apenas filtra localmente e desenha uma tabela. `OrdersPage` consome o detalhe, mas não mostra todos os campos que o endpoint devolve. `NotificationsPage` usa criar/arquivar, embora o formulário não exponha todos os campos aceites pela API.

A autenticação React envia `adminOnly: true` em login e refresh e chama `GET /auth/me`. O Flutter não envia `adminOnly` no login, mas verifica a role recebida; as operações admin subsequentes são protegidas no servidor.

### Backend

`backend/src/app.js` monta as rotas em `/api/auth`, `/api/categories`, `/api/products`, `/api/orders`, `/api/users`, `/api/notifications` e `/api/admin`. A auditoria consultou estas rotas e services, não apenas o prefixo `/api/admin`.

- `modules/admin/admin.routes.js` aplica `requireAuth` e `requireRole('admin')` a dashboard, clientes, upload de imagem, encomendas e notificações.
- `modules/products/product.routes.js` e `modules/categories/category.routes.js` tornam as leituras públicas, mas exigem admin para criar/editar/eliminar. Os controllers validam payloads e encaminham operações para services implementados.
- `modules/orders/order.routes.js` contém rotas de cliente; as operações administrativas são expostas por `admin.routes.js`. `order.validators.js` valida filtros e payloads; `order.service.js` executa consulta, transições, efeitos de stock e notificações.
- `modules/notifications/notifications.routes.js` é exclusiva de clientes. A gestão administrativa está em `admin.routes.js`; `notifications.validators.js` e `notifications.service.js` implementam paginação, criação, idempotência, destinatários e arquivo.
- `modules/users/users.routes.js` oferece perfil e moradas em `/me`. O controller passa sempre `req.user.id` ao service, cujas consultas de moradas também filtram por esse ID. Isto não é um endpoint de acesso administrativo aos dados de outro cliente.
- `modules/auth/auth.routes.js` oferece autenticação e `/me`; `auth.validators.js` aceita `adminOnly` e `auth.service.js` verifica a role quando solicitado.

#### Rotas genéricas relevantes e permissões

| Rotas | Acesso efectivo | Contrato/implementação relevante |
|---|---|---|
| `/api/admin/*` | `requireAuth` + `requireRole('admin')` aplicados no router. | Dashboard, lista de clientes, upload de produto, gestão de encomendas e gestão de notificações são implementados pelos respectivos controllers/services. Não inclui detalhe/CRUD de clientes, gestão de administradores ou settings. |
| `/api/products` e `/api/categories` | Leitura pública; escrita com `requireAuth` + `requireRole('admin')`. | CRUD real. Produtos aceitam campos de stock/imagens/categoria/flags; categorias aceitam `name`, `slug`, `icon_url`, `parent_id`. |
| `/api/users/me`, `/me/photo`, `/me/password`, `/me/stats` | `requireAuth`; os controllers passam sempre `req.user.id`. Não aceitam um ID de cliente alvo. | Perfil pode ser consultado/alterado (`fullName`, `phone`, `birthDate`, `gender`); fotografia recebe `base64`; password recebe `currentPassword` e `newPassword`; estatísticas são do próprio utilizador. |
| `/api/users/me/addresses` e `/api/users/me/addresses/:id[/default]` | `requireAuth`; service filtra por `user_id = req.user.id`. | Lista/cria/edita/remove/define endereço padrão; payload validado inclui `label`, `province`, `city`, `neighborhood`, `street`, `number`, `reference`, `latitude` e `longitude`. Não é acesso admin a moradas de qualquer cliente. |
| `/api/users/me/payment-methods/*` | Montado sob `/users/me` depois de `requireAuth`; operações são para o titular autenticado. | Não constitui API de consulta administrativa dos métodos de pagamento de clientes. |
| `/api/orders` | `requireAuth`; consulta/detalhe são do `req.user.id`. | O acesso administrativo de encomendas é separado em `/api/admin/orders`; os paths genéricos não substituem esse contrato. |
| `/api/notifications/*` | `requireAuth` + `requireRole('customer')`. | Lista, contador e marcação de leitura destinam-se a clientes; gestão admin está separada em `/api/admin/notifications`. |
| `/api/auth/login`, `/refresh`, `/logout`, `/me` | Login/refresh públicos com validação; `/me` exige autenticação. | `adminOnly` é opcional no contrato do backend e, quando verdadeiro, `auth.service` rejeita roles não-admin. `/auth/me` devolve apenas o utilizador do token. |

Não foi identificado `BACKEND ALTERADO` para os contratos efectivamente usados pelos repositories Flutter: os endpoints equivalentes continuam montados e os contratos principais correspondem aos clientes. As diferenças identificadas são omissões de consumo no React ou capacidades administrativas que nunca estiveram disponíveis no Flutter.

## Plano de migração priorizado

### Prioridade 1 — completar funcionalidades já suportadas

1. **Completar o detalhe de encomenda React sem alterar a API.** Adicionar ao modelo `AdminOrder` os campos devolvidos (`address`, `paymentMethod`, `couponCode`, totais detalhados e campos de cliente relevantes) e apresentá-los em `OrderDetails`. O endpoint já é `GET /admin/orders/:id`.
2. **Repor filtros temporais de encomendas.** Adicionar campos `from`/`to` ao estado do `OrdersPage`, ao tipo/parâmetros de `adminApi.listOrders` e enviá-los como `YYYY-MM-DD`. `listOrdersQuerySchema` e `listOrdersForAdmin` já os suportam.
3. **Migrar a opção de notificação associada ao novo produto.** Adicionar opção ao formulário de produto e, após criação, chamar `adminApi.createNotification` com título/mensagem, `type: 'new_product'`, `product_id`, `recipient_scope: 'all_customers'`, `status: 'published'` e uma `idempotency_key` estável. O endpoint e a persistência já existem. Tratar separadamente falha da notificação após sucesso de criação, para não sugerir que o produto não foi criado.
4. **Completar o formulário de notificações.** Expor `product_id`, `starts_at` e `expires_at` na página React e nos tipos de payload; conservar os campos opcionais e validações existentes no backend. Se for necessário filtrar por estado em todas as páginas, fazê-lo no servidor ou filtrar o conjunto completo — o filtro React actual só percorre a página recebida.
5. **Restaurar o diálogo de detalhe básico do cliente.** Usar o item já carregado por `GET /admin/customers` para exibir imagem, ID, nome, email, telefone e data, sem inventar endpoint. Se não existir no conjunto paginado (o endpoint actual não pagina), não é necessária outra chamada.

### Prioridade 2 — decidir e especificar capacidades não existentes

6. **Gestão administrativa de clientes / moradas / histórico:** não ligar `/users/me` como se aceitasse um ID alvo. Para permitir consulta admin de um cliente, falta especificar e implementar endpoint protegido, por exemplo `GET /api/admin/customers/:id`, com validação do ID e service que confirme `role = 'customer'` e devolva explicitamente o perfil/moradas/histórico pretendidos. Para edição, estado activo ou eliminação, faltam operações e regras próprias de autorização/auditoria; não existem no backend actual nem no Flutter auditado.
7. **Gestão de administradores:** faltam rotas e services admin para listar/criar/editar/desactivar contas administrativas, bem como regras de autorização e validação para alterar roles. `/auth/register` não é um endpoint de gestão de admins e as rotas actuais não fornecem essa capacidade.
8. **Definições da loja:** faltam contrato de leitura/escrita, validação, persistência e endpoints para nome/contactos/moeda/fuso horário e preferências. A página React deverá permanecer identificada como indisponível até existir esse contrato.
9. **Edição do perfil pessoal do administrador:** pode ser ligada às rotas existentes `/api/users/me`, `/me/photo` e `/me/password` para editar apenas a própria conta. Não usar estas rotas para consultar ou editar outro utilizador. Não há edição equivalente no Flutter antigo.

## Validação

Auditoria documental e de código; não foram executados testes nem alterados ficheiros de aplicação. A verificação de estado deve confirmar que a única alteração introduzida por esta tarefa é `ADMIN_MIGRATION_AUDIT.md`, mantendo intactas as três alterações locais preexistentes.
