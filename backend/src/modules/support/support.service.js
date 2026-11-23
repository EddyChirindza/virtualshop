const { pool, query } = require('../../config/db');
const { ApiError } = require('../../middlewares/error.middleware');
const { answerCustomerQuestion } = require('./support.faq');

async function inTransaction(operation) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getMessages(conversationId) {
  const { rows } = await query(
    `SELECT id, conversation_id, sender_type, sender_user_id, body,
            handoff_available, created_at
     FROM support_messages
     WHERE conversation_id = $1
     ORDER BY id DESC
     LIMIT 200`,
    [conversationId],
  );
  return rows.reverse();
}

async function getCustomerConversation(customerId) {
  const { rows } = await query(
    `SELECT c.id, c.status, c.assigned_support_id, support.full_name AS assigned_support_name,
            c.created_at, c.updated_at, c.last_message_at
     FROM support_conversations c
     LEFT JOIN users support ON support.id = c.assigned_support_id
     WHERE c.customer_id = $1 AND c.status <> 'closed'
     ORDER BY c.updated_at DESC
     LIMIT 1`,
    [customerId],
  );
  const conversation = rows[0] ?? null;
  return {
    conversation,
    messages: conversation ? await getMessages(conversation.id) : [],
  };
}

async function sendCustomerMessage(customerId, message, language) {
  await inTransaction(async (client) => {
    let { rows } = await client.query(
      `SELECT id, status
       FROM support_conversations
       WHERE customer_id = $1 AND status <> 'closed'
       FOR UPDATE`,
      [customerId],
    );
    let conversation = rows[0];

    if (!conversation) {
      const created = await client.query(
        `INSERT INTO support_conversations (customer_id)
         VALUES ($1)
         ON CONFLICT (customer_id) WHERE status <> 'closed'
         DO NOTHING
         RETURNING id, status`,
        [customerId],
      );
      conversation = created.rows[0];
      if (!conversation) {
        rows = (await client.query(
          `SELECT id, status
           FROM support_conversations
           WHERE customer_id = $1 AND status <> 'closed'
           FOR UPDATE`,
          [customerId],
        )).rows;
        conversation = rows[0];
      }
    }

    if (!conversation) {
      throw new ApiError(409, 'Não foi possível iniciar esta conversa. Tenta novamente.');
    }

    await client.query(
      `INSERT INTO support_messages
         (conversation_id, sender_type, sender_user_id, body)
       VALUES ($1, 'customer', $2, $3)`,
      [conversation.id, customerId, message],
    );

    if (conversation.status === 'bot') {
      const reply = answerCustomerQuestion(message, language);
      await client.query(
        `INSERT INTO support_messages
           (conversation_id, sender_type, body, handoff_available)
         VALUES ($1, 'bot', $2, $3)`,
        [conversation.id, reply.text, reply.handoffAvailable],
      );
    }

    await client.query(
      `UPDATE support_conversations
       SET updated_at = now(), last_message_at = now()
       WHERE id = $1`,
      [conversation.id],
    );
  });

  return getCustomerConversation(customerId);
}

async function requestAgent(customerId) {
  const { rows } = await query(
    `UPDATE support_conversations
     SET status = CASE WHEN status = 'bot' THEN 'waiting' ELSE status END,
         updated_at = now()
     WHERE customer_id = $1 AND status IN ('bot', 'waiting', 'active')
     RETURNING id`,
    [customerId],
  );
  if (!rows[0]) {
    throw new ApiError(404, 'Não encontrámos uma conversa aberta para encaminhar.');
  }
  return getCustomerConversation(customerId);
}

async function listAgentConversations() {
  const { rows } = await query(
    `SELECT c.id, c.customer_id, customer.full_name AS customer_name,
            customer.phone AS customer_phone, c.status, c.assigned_support_id,
            support.full_name AS assigned_support_name, c.created_at,
            c.updated_at, c.last_message_at, last.body AS last_message,
            last.sender_type AS last_sender_type
     FROM support_conversations c
     JOIN users customer ON customer.id = c.customer_id
     LEFT JOIN users support ON support.id = c.assigned_support_id
     LEFT JOIN LATERAL (
       SELECT body, sender_type
       FROM support_messages
       WHERE conversation_id = c.id
       ORDER BY id DESC
       LIMIT 1
     ) last ON true
     WHERE c.status IN ('waiting', 'active')
     ORDER BY CASE c.status WHEN 'waiting' THEN 0 ELSE 1 END,
              c.last_message_at DESC, c.id DESC`,
  );
  return rows;
}

async function getAgentConversation(conversationId) {
  const { rows } = await query(
    `SELECT c.id, c.customer_id, customer.full_name AS customer_name,
            customer.phone AS customer_phone, c.status, c.assigned_support_id,
            support.full_name AS assigned_support_name, c.created_at,
            c.updated_at, c.last_message_at
     FROM support_conversations c
     JOIN users customer ON customer.id = c.customer_id
     LEFT JOIN users support ON support.id = c.assigned_support_id
     WHERE c.id = $1`,
    [conversationId],
  );
  const conversation = rows[0];
  if (!conversation) throw new ApiError(404, 'Conversa não encontrada.');
  return { conversation, messages: await getMessages(conversationId) };
}

async function claimConversation(conversationId, supportUserId) {
  await inTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id, status, assigned_support_id
       FROM support_conversations
       WHERE id = $1
       FOR UPDATE`,
      [conversationId],
    );
    const conversation = rows[0];
    if (!conversation) throw new ApiError(404, 'Conversa não encontrada.');

    if (conversation.status === 'waiting') {
      await client.query(
        `UPDATE support_conversations
         SET status = 'active', assigned_support_id = $2, updated_at = now()
         WHERE id = $1`,
        [conversationId, supportUserId],
      );
      return;
    }
    if (
      conversation.status !== 'active' ||
      Number(conversation.assigned_support_id) !== Number(supportUserId)
    ) {
      throw new ApiError(409, 'Esta conversa já está a ser atendida por outra pessoa.');
    }
  });
  return getAgentConversation(conversationId);
}

async function sendAgentMessage(conversationId, supportUserId, message) {
  await inTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT status, assigned_support_id
       FROM support_conversations
       WHERE id = $1
       FOR UPDATE`,
      [conversationId],
    );
    const conversation = rows[0];
    if (!conversation) throw new ApiError(404, 'Conversa não encontrada.');
    if (
      conversation.status !== 'active' ||
      Number(conversation.assigned_support_id) !== Number(supportUserId)
    ) {
      throw new ApiError(409, 'Assume esta conversa antes de responder.');
    }

    await client.query(
      `INSERT INTO support_messages
         (conversation_id, sender_type, sender_user_id, body)
       VALUES ($1, 'support', $2, $3)`,
      [conversationId, supportUserId, message],
    );
    await client.query(
      `UPDATE support_conversations
       SET updated_at = now(), last_message_at = now()
       WHERE id = $1`,
      [conversationId],
    );
  });
  return getAgentConversation(conversationId);
}

async function closeConversation(conversationId, supportUserId, role) {
  await inTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT status, assigned_support_id
       FROM support_conversations
       WHERE id = $1
       FOR UPDATE`,
      [conversationId],
    );
    const conversation = rows[0];
    if (!conversation) throw new ApiError(404, 'Conversa não encontrada.');
    if (
      role !== 'admin' &&
      Number(conversation.assigned_support_id) !== Number(supportUserId)
    ) {
      throw new ApiError(403, 'Só a pessoa responsável pode encerrar esta conversa.');
    }

    await client.query(
      `UPDATE support_conversations
       SET status = 'closed', updated_at = now()
       WHERE id = $1`,
      [conversationId],
    );
  });
  return getAgentConversation(conversationId);
}

module.exports = {
  getCustomerConversation,
  sendCustomerMessage,
  requestAgent,
  listAgentConversations,
  getAgentConversation,
  claimConversation,
  sendAgentMessage,
  closeConversation,
};
