type Translator = (message: string) => string;

const errorMessages: [RegExp, string][] = [
  [/(token|jwt).*(invalid|expired|nao fornecido|missing)|invalid.*(token|jwt)|sessao.*(invalida|expirada)|session.*(invalid|expired)|unauthori[sz]ed|not authenticated|authentication required/, 'A sua sessão terminou. Entre novamente para continuar.'],
  [/credenciais invalidas|invalid credentials|wrong password|password.*(incorrect|invalid)|email or password/, 'O email/telemóvel ou a palavra-passe não estão corretos.'],
  [/ja existe uma conta|account already exists|already (in use|registered)/, 'Já existe uma conta com este email ou telemóvel. Tente iniciar sessão.'],
  [/password atual.*incorreta|current password.*incorrect/, 'A palavra-passe atual não está correta. Verifique-a e tente novamente.'],
  [/failed to fetch|network|econn|connection|fetch failed|load failed|timed? out|timeout/, 'Não foi possível ligar à loja. Verifique a sua ligação à internet e tente novamente.'],
  [/acesso negado|forbidden|not authorized/, 'Não tem autorização para fazer esta ação.'],
  [/stock insuficiente|insufficient stock/, 'Não há stock suficiente para esta quantidade. Reduza a quantidade e tente novamente.'],
  [/carrinho vazio|cart empty/, 'O seu carrinho está vazio. Adicione produtos antes de continuar.'],
  [/cupao.*invalido|invalid coupon|coupon.*invalid/, 'Este cupão não é válido. Verifique o código e tente novamente.'],
  [/demasiad[oa]s? (pedidos|tentativas)|too many requests|rate limit/, 'Está a fazer muitos pedidos. Aguarde um pouco e tente novamente.'],
  [/utilizador nao encontrado|user not found/, 'Não encontrámos a sua conta. Confirme os dados e tente novamente.'],
  [/produto nao encontrado|product not found/, 'Não encontrámos este produto. Pode já não estar disponível.'],
  [/item do carrinho nao encontrado|cart item not found/, 'Este artigo já não está no carrinho. Atualize a página e tente novamente.'],
  [/endereco.*nao encontrado|address not found/, 'Este endereço já não está disponível. Atualize a página e tente novamente.'],
  [/metodo de pagamento.*nao encontrado|payment method not found/, 'Este método de pagamento já não está disponível. Atualize a página e tente novamente.'],
  [/not found|does not exist|is no longer available/, 'Não encontrámos a informação pedida. Atualize a página e tente novamente.'],
  [/ja esta associado a outra conta|already associated with another account/, 'Este email ou telemóvel já está associado a outra conta. Tente iniciar sessão.'],
  [/validade do cartao ja expirou|card.*expired/, 'Este cartão já expirou. Use outro cartão ou escolha outro método de pagamento.'],
  [/imagem.*(demasiado grande|too large)|image.*too large/, 'A fotografia não foi enviada porque é demasiado grande. Escolha uma imagem menor.'],
  [/formato.*invalido|formato nao suportado|not a valid image|unsupported format/, 'Escolha uma imagem JPG, PNG ou WebP.'],
  [/invalid input|expected .+ received|undefined|null value|validation error|quantity invalida|id .* invalido|productid invalido/, 'Não foi possível validar os dados. Confira os campos e tente novamente.'],
  [/internal server|server error|service unavailable|erro interno do servidor|sql|database|econnreset|erro [45]\d\d|http [45]\d\d/, 'Ocorreu um problema na loja. Tente novamente dentro de alguns minutos.'],
];

const technicalMessage = /(?:\b(?:token|jwt|sql|database|undefined|null|expected|received|econn|canvas|blob|error|failed|failure|unexpected|exception|timeout|expired|unauthorized|forbidden|unavailable|cannot|unable|wrong)\b|invalid input|request failed|could not|went wrong|typeerror|referenceerror|syntaxerror|^error\b|erro [45]\d\d|http [45]\d\d|[a-z][a-z0-9]*_[a-z])/i;

export function customerErrorMessage(error: unknown, t: Translator): string {
  const raw = error instanceof Error
    ? error.message.trim()
    : typeof error === 'string' ? error.trim() : '';

  if (!raw) return t('Ocorreu um problema ao concluir esta ação. Tente novamente.');

  const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const match = errorMessages.find(([pattern]) => pattern.test(normalized));
  if (match) return t(match[1]);
  if (technicalMessage.test(normalized)) {
    return t('Ocorreu um problema ao concluir esta ação. Tente novamente.');
  }

  const translated = t(raw);
  if (t('Entrar') === 'Sign in' && translated === raw) {
    return t('Ocorreu um problema ao concluir esta ação. Tente novamente.');
  }
  return translated;
}
