// ─────────────────────────────────────────────
// VirtualShop API — Ponto de entrada
// ─────────────────────────────────────────────
const app = require('./src/app');
const env = require('./src/config/env');

app.listen(env.port, env.host, () => {
  console.log(`[server] VirtualShop API a correr em http://${env.host}:${env.port}`);
});
