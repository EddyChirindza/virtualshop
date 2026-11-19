const { ApiError } = require('../../middlewares/error.middleware');
const service = require('./support.service');
const { customerMessageSchema, agentMessageSchema } = require('./support.validators');

function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ApiError(400, 'Identificador de conversa inválido.');
  }
  return id;
}

async function customerConversation(req, res, next) {
  try {
    res.json({
      success: true,
      message: 'OK',
      data: await service.getCustomerConversation(req.user.id),
    });
  } catch (err) {
    next(err);
  }
}

async function customerMessage(req, res, next) {
  try {
    const fields = customerMessageSchema.parse(req.body);
    const data = await service.sendCustomerMessage(
      req.user.id,
      fields.message,
      fields.language,
    );
    res.status(201).json({ success: true, message: 'Mensagem enviada.', data });
  } catch (err) {
    next(err);
  }
}

async function requestAgent(req, res, next) {
  try {
    res.json({
      success: true,
      message: 'Pedido de assistência enviado.',
      data: await service.requestAgent(req.user.id),
    });
  } catch (err) {
    next(err);
  }
}

async function agentConversations(req, res, next) {
  try {
    res.json({
      success: true,
      message: 'OK',
      data: await service.listAgentConversations(),
    });
  } catch (err) {
    next(err);
  }
}

async function agentConversation(req, res, next) {
  try {
    res.json({
      success: true,
      message: 'OK',
      data: await service.getAgentConversation(parseId(req.params.id)),
    });
  } catch (err) {
    next(err);
  }
}

async function claimConversation(req, res, next) {
  try {
    res.json({
      success: true,
      message: 'Conversa assumida.',
      data: await service.claimConversation(parseId(req.params.id), req.user.id),
    });
  } catch (err) {
    next(err);
  }
}

async function agentMessage(req, res, next) {
  try {
    const fields = agentMessageSchema.parse(req.body);
    res.status(201).json({
      success: true,
      message: 'Mensagem enviada.',
      data: await service.sendAgentMessage(
        parseId(req.params.id),
        req.user.id,
        fields.message,
      ),
    });
  } catch (err) {
    next(err);
  }
}

async function closeConversation(req, res, next) {
  try {
    res.json({
      success: true,
      message: 'Conversa encerrada.',
      data: await service.closeConversation(
        parseId(req.params.id),
        req.user.id,
        req.user.role,
      ),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  customerConversation,
  customerMessage,
  requestAgent,
  agentConversations,
  agentConversation,
  claimConversation,
  agentMessage,
  closeConversation,
};
