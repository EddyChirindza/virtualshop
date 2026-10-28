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

- Existe `POST /orders` para checkout e `GET /orders/:id` para consultar uma encomenda, mas não existe endpoint de listagem do histórico.
- O checkout aceita endereço, cupão e notas, mas não há contrato de gateway ou selecção de método de pagamento.
- Favoritos e notificações requerem autenticação. Promoções aparecem como notificações quando publicadas pelo backend.
