const { z } = require('zod');

const customerMessageSchema = z.object({
  message: z.string().trim().min(1, 'Escreve uma mensagem.').max(2000, 'A mensagem é demasiado longa.'),
  language: z.enum(['pt', 'en']).optional().default('pt'),
});

const agentMessageSchema = z.object({
  message: z.string().trim().min(1, 'Escreve uma mensagem.').max(2000, 'A mensagem é demasiado longa.'),
});

module.exports = { customerMessageSchema, agentMessageSchema };
