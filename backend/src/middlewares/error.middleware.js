// ─────────────────────────────────────────────
// VirtualShop API — Tratamento central de erros
//
// Qualquer erro lançado (ou passado a next(err)) cai aqui.
// Nunca expor detalhes internos (stack, SQL) ao cliente.
// ─────────────────────────────────────────────
const logger = require('../utils/logger');

class ApiError extends Error {
  constructor(statusCode, message, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: 'Rota não encontrada.' });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Erros de validação do Zod
  if (err.name === 'ZodError') {
    const message = err.errors?.[0]?.message || 'Dados inválidos.';
    return res.status(400).json({ success: false, message });
  }

  const statusCode = err.statusCode || 500;

  if (statusCode === 500) {
    logger.error('Erro não tratado', err);
  }

  res.status(statusCode).json({
    success: false,
    code: err.code || null,
    message: statusCode === 500 ? 'Erro interno do servidor.' : err.message,
  });
}

module.exports = { ApiError, notFoundHandler, errorHandler };
