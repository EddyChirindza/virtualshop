const faqEntries = [
  {
    pattern: /\b(pedido|pedidos|encomenda|encomendas|acompanhar|rastrear|tracking|order|orders)\b/,
    answer: {
      pt: 'Pode acompanhar a sua encomenda em A minha conta > Os meus pedidos. Abra a encomenda para consultar o estado.',
      en: 'You can track your order in My account > My orders. Open the order to check its status.',
    },
  },
  {
    pattern: /\b(entrega|entregar|delivery|levantamento|recolha|taxa)\b/,
    answer: {
      pt: 'A entrega ao domicílio custa 50 MT e o levantamento na loja é grátis. As opções aparecem ao finalizar a compra.',
      en: 'Home delivery costs 50 MT and store pickup is free. You can choose an option at checkout.',
    },
  },
  {
    pattern: /\b(pagamento|pagamentos|pagar|cartao|payment|payments|pay)\b/,
    answer: {
      pt: 'No checkout, escolha um dos métodos de pagamento disponíveis para a sua encomenda.',
      en: 'At checkout, choose one of the payment methods available for your order.',
    },
  },
];

function answerCustomerQuestion(question, language = 'pt') {
  const normalized = question
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const match = faqEntries.find((entry) => entry.pattern.test(normalized));

  if (match) {
    return { text: match.answer[language === 'en' ? 'en' : 'pt'], handoffAvailable: false };
  }

  return {
    text: language === 'en'
      ? 'I could not find a helpful answer. Would you like to ask a support agent?'
      : 'Ainda não encontrei uma resposta útil. Quer pedir ajuda a um assistente?',
    handoffAvailable: true,
  };
}

module.exports = { answerCustomerQuestion };
