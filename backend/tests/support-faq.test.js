const test = require('node:test');
const assert = require('node:assert/strict');
const { answerCustomerQuestion } = require('../src/modules/support/support.faq');

test('responde perguntas frequentes em português sem diferenciar acentos', () => {
  const answer = answerCustomerQuestion('Qual é o custo da entrega?', 'pt');

  assert.equal(answer.handoffAvailable, false);
  assert.match(answer.text, /50 MT/);
});

test('responde perguntas frequentes em inglês', () => {
  const answer = answerCustomerQuestion('How can I track my order?', 'en');

  assert.equal(answer.handoffAvailable, false);
  assert.match(answer.text, /My orders/);
});

test('sugere assistência quando não encontra uma resposta', () => {
  const answer = answerCustomerQuestion('Quero devolver um artigo', 'pt');

  assert.equal(answer.handoffAvailable, true);
  assert.match(answer.text, /assistente/);
});
