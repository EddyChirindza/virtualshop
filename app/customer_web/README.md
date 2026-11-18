# VirtualShop Customer Web

Frontend React independente para navegador. O `app/customer_app` mantém Flutter/Dart para Android e iOS.

## Desenvolvimento

```sh
cp .env.example .env.local
# Ajuste VITE_API_BASE_URL para a URL acessível do backend
npm install
npm run dev
```

Sem configuração, a aplicação usa `http://localhost:3000/api`. A API deve permitir a origem do frontend em `CORS_ORIGINS` quando executado fora de localhost.

## Build

```sh
npm run build
npm run preview
```

O token de acesso e o refresh token são guardados no armazenamento local do navegador; não são credenciais privadas. Em produção, sirva o site por HTTPS e configure o backend para aceitar a origem exacta. O frontend usa apenas os endpoints já existentes.

## Limitações conhecidas da API

- O catálogo suporta pesquisa, categoria, preço, ordenação e paginação (até 50 produtos por pedido), além de secções de populares e novidades.
- A conta liga perfil, estatísticas, endereços (incluindo endereço padrão), fotografia, alteração de palavra-passe, favoritos, carrinho, notificações e histórico de encomendas.
- O checkout aceita entrega ao domicílio ou levantamento, método de pagamento guardado, cupão e notas. O código `PROMO10` dá 10% de desconto; a API cobra 50 MT por entrega ao domicílio.
- Os métodos de pagamento aceitam M-Pesa e Visa, mas o backend usa um processador de demonstração e não realiza cobranças reais.
- Favoritos e notificações requerem autenticação. Promoções aparecem como notificações quando publicadas pelo backend.
