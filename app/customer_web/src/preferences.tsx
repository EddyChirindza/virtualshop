import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type Language = 'pt' | 'en';
export type Theme = 'light' | 'dark';

const LANGUAGE_KEY = 'vs.language';
const THEME_KEY = 'vs.theme';

const messages: Record<string, string> = {
  'Início': 'Home', 'Conta': 'Account', 'Entrar': 'Sign in',
  'Avisos': 'Notifications', 'Pesquisar produtos, marcas e categorias': 'Search products, brands and categories',
  'Pesquisar produtos': 'Search products', 'Filtros': 'Filters', 'Preço mínimo': 'Minimum price',
  'Preço máximo': 'Maximum price', 'Relevância': 'Relevance', 'Mais relevantes': 'Most relevant',
  'Mais recentes': 'Newest', 'Menor preço': 'Lowest price', 'Maior preço': 'Highest price',
  'Limpar filtros': 'Clear filters', 'Pesquisar': 'Search', 'Os meus pedidos': 'My orders',
  'Loja': 'Shop', 'A minha conta': 'My account', 'Perfil': 'Profile',
  'Entrega ao domicílio: 50 MT · Levantamento na loja: grátis': 'Home delivery: 50 MT · Free in-store pickup',
  'Entrega ao domicílio: 50 MT · Levantamento grátis': 'Home delivery: 50 MT · Free pickup',
  'Entrega ao domicílio': 'Home delivery', 'Taxa fixa de 50 MT · levantamento grátis': 'Flat fee of 50 MT · free pickup',
  'Compra segura': 'Secure shopping', 'Os seus dados protegidos': 'Your data is protected',
  'Feito em Moçambique': 'Made in Mozambique', 'Entregamos em todo o país': 'We deliver nationwide',
  'Tudo o que precisa, entregue em casa.': 'Everything you need, delivered to your door.',
  'Milhares de produtos com os melhores preços, escolhidos a pensar em si.': 'Thousands of products at great prices, chosen for you.',
  'Ver produtos': 'Browse products', 'Todas as categorias': 'All categories', 'Promoção': 'Promotion',
  'Novidade': 'New', 'Categoria em destaque': 'Featured category', 'Produto em destaque': 'Featured product',
  'Banner promocional': 'Promotional banner', 'Banner anterior': 'Previous banner', 'Próximo banner': 'Next banner',
  'Destaques': 'Highlights', 'Mais populares': 'Most popular', 'Novidades': 'New arrivals',
  'A carregar produtos…': 'Loading products…', 'Não foi possível carregar os produtos': 'Could not load products',
  'Tentar de novo': 'Try again', 'Nenhum produto encontrado': 'No products found',
  'Experimente outro termo ou escolha outra categoria.': 'Try another search or choose a different category.',
  'Esgotado': 'Out of stock', 'Restam': 'Only', 'Guardar nos favoritos': 'Add to favourites',
  'Adicionar ao carrinho': 'Add to basket', 'Produto adicionado ao carrinho.': 'Product added to basket.',
  'Resultados para': 'Results for', 'Os mais procurados': 'Most popular',
  'Anterior': 'Previous', 'Seguinte': 'Next', 'Página': 'Page', 'produtos': 'products',
  'Não foi possível carregar os banners:': 'Could not load banners:',
  'Carrinho': 'Basket', 'Esvaziar carrinho': 'Empty basket', 'A carregar o carrinho': 'Loading basket',
  'Não foi possível abrir o carrinho': 'Could not open basket', 'O carrinho está vazio': 'Your basket is empty',
  'Adicione produtos para continuar.': 'Add products to continue.', 'Remover todos os produtos do carrinho?': 'Remove all products from your basket?',
  'cada': 'each', 'Diminuir': 'Decrease', 'Aumentar': 'Increase', 'Remover': 'Remove',
  'Resumo da compra': 'Order summary', 'artigo': 'item', 'artigos': 'items', 'Desconto': 'Discount',
  'Entrega': 'Delivery', 'Calculada no checkout': 'Calculated at checkout', 'Total parcial': 'Subtotal',
  'Finalizar compra': 'Checkout', 'Continuar a comprar': 'Continue shopping',
  'A preparar a encomenda…': 'Preparing your order…',
  'Não foi possível abrir o checkout': 'Could not open checkout', 'Entrega ao domicílio: 50 MT. Levantamento na loja: grátis.': 'Home delivery: 50 MT. In-store pickup: free.',
  'Levantamento na loja': 'In-store pickup', 'Ainda não tem endereços.': 'You have no addresses yet.',
  'Adicionar endereço': 'Add address', 'Pagamento': 'Payment', 'Dinheiro na entrega': 'Cash on delivery',
  'Padrão': 'Default', 'métodos de pagamento': 'payment methods', 'Adicione um método guardado em': 'Add a saved method under',
  'ou pague na entrega.': 'or pay on delivery.', 'Gerir métodos de pagamento': 'Manage payment methods',
  'Cupão (opcional)': 'Coupon (optional)', 'Use PROMO10 para obter 10% de desconto.': 'Use PROMO10 for 10% off.',
  'Notas para a entrega (opcional)': 'Delivery notes (optional)', 'Resumo': 'Summary', 'Grátis': 'Free',
  'A processar…': 'Processing…', 'Confirmar encomenda': 'Place order', 'Voltar ao carrinho': 'Back to basket',
  'Resumo de compras': 'Order summary', 'Ver pedidos': 'View orders', 'gastos': 'spent',
  'Tem': 'You have', 'à espera': 'waiting', 'Total do carrinho:': 'Basket total:',
  'Encomendas recentes': 'Recent orders', 'Ver todas': 'View all', 'Ainda não fez nenhuma encomenda.': 'You have not placed any orders yet.',
  'Descobrir produtos': 'Discover products', 'Endereço de entrega': 'Delivery address', 'Gerir': 'Manage',
  'Adicionar': 'Add',
  'Novidades para si': 'Updates for you', 'Está tudo em dia.': 'You are all caught up.',
  'Dados pessoais': 'Personal details', 'Fotografia': 'Photo', 'Alterar fotografia': 'Change photo',
  'Adicionar fotografia': 'Add photo', 'Remover fotografia': 'Remove photo', 'A enviar…': 'Uploading…',
  'Guardar fotografia': 'Save photo', 'Cancelar': 'Cancel', 'JPG, PNG ou WebP. A imagem é cortada em quadrado.': 'JPG, PNG or WebP. The image is cropped to a square.',
  'Informação da conta': 'Account information', 'Nome completo': 'Full name', 'Telemóvel': 'Mobile number',
  'Email': 'Email', ' (opcional)': ' (optional)', 'O email não pode ser alterado depois de guardado.': 'Email cannot be changed after it is saved.',
  'Género': 'Gender', 'Seleccionar': 'Select', 'Masculino': 'Male', 'Feminino': 'Female', 'Outro': 'Other',
  'Prefiro não dizer': 'Prefer not to say', 'Data de nascimento': 'Date of birth', 'A guardar…': 'Saving…',
  'Guardar alterações': 'Save changes', 'Segurança e palavra-passe': 'Security and password',
  'Palavra-passe actual': 'Current password', 'Nova palavra-passe': 'New password',
  'Confirmar nova palavra-passe': 'Confirm new password', 'A alterar…': 'Changing…',
  'Alterar palavra-passe': 'Change password', 'Esconder palavra-passe': 'Hide password',
  'Mostrar palavra-passe': 'Show password', 'Pelo menos 8 caracteres': 'At least 8 characters',
  'Uma letra maiúscula': 'One uppercase letter', 'Uma letra minúscula': 'One lowercase letter',
  'Força:': 'Strength:', 'Fraca': 'Weak', 'Razoável': 'Fair', 'Boa': 'Good', 'Forte': 'Strong',
  'As palavras-passe não coincidem.': 'Passwords do not match.',
  'A nova palavra-passe tem de ser diferente da actual.': 'The new password must differ from the current one.',
  'Dados actualizados.': 'Details updated.', 'Fotografia actualizada.': 'Photo updated.',
  'Fotografia removida.': 'Photo removed.', 'Remover a sua fotografia?': 'Remove your photo?',
  'Escolha um ficheiro de imagem.': 'Choose an image file.', 'A imagem é demasiado grande (máximo 10 MB).': 'Image is too large (10 MB maximum).',
  'Não foi possível ler esta imagem. Experimente um ficheiro JPG ou PNG.': 'Could not read this image. Try a JPG or PNG file.',
  'Cliente': 'Customer', 'Olá,': 'Hello,', 'Complete os seus dados para comprar mais depressa.': 'Complete your details for a faster checkout.',
  'Editar perfil': 'Edit profile', 'No carrinho': 'In basket', 'Avisos por ler': 'Unread notifications',
  'Endereços': 'Addresses', 'Alguns dados da conta não carregaram:': 'Some account details could not be loaded:',
  'A sua sessão expirou': 'Your session has expired',
  'Por segurança, termine e volte a entrar para continuar.': 'For your security, sign out and back in to continue.',
  'Entrar novamente': 'Sign in again', 'Não foi possível abrir a conta': 'Could not open account',
  'A carregar favoritos…': 'Loading favourites…',
  'Não foi possível carregar os favoritos': 'Could not load favourites',
  'Ainda não guardou nenhum produto': 'You have not saved any products yet.',
  'Toque no coração de um produto para o encontrar aqui.': 'Tap a product heart to find it here.',
  'Remover dos favoritos': 'Remove from favourites',
  'Notificações': 'Notifications', 'Marcar todas como lidas': 'Mark all as read',
  'A carregar notificações…': 'Loading notifications…', 'Não foi possível carregar as notificações': 'Could not load notifications',
  'Sem notificações por agora': 'No notifications yet', '(nova)': '(new)', 'Ver encomenda': 'View order',
  'Ver produto': 'View product', 'A carregar…': 'Loading…', 'Carregar mais': 'Load more',
  'Os meus endereços': 'My addresses', 'Novo endereço': 'New address', 'Editar endereço': 'Edit address',
  'A carregar endereços…': 'Loading addresses…', 'Não foi possível carregar os endereços': 'Could not load addresses',
  'Ainda não tem endereços guardados': 'You have no saved addresses yet.',
  'Adicione um para finalizar compras mais depressa.': 'Add one for a faster checkout.',
  'Nome do endereço (ex.: Casa, Trabalho)': 'Address name (e.g. Home, Work)',
  'Rua / Avenida': 'Street / Avenue', 'Número': 'Number', 'Bairro': 'Neighbourhood', 'Cidade': 'City',
  'Ponto de referência (opcional)': 'Landmark (optional)', 'Província': 'Province',
  'Apagar o endereço': 'Delete address', 'Definir como padrão': 'Set as default', 'Referência:': 'Landmark:',
  'Métodos de pagamento': 'Payment methods', 'A carregar métodos de pagamento…': 'Loading payment methods…',
  'Não foi possível carregar os métodos': 'Could not load payment methods', 'Editar método': 'Edit payment method',
  'Adicionar método': 'Add payment method', 'Tipo': 'Type', 'Nome (opcional)': 'Name (optional)',
  'Ex.: M-Pesa pessoal': 'e.g. Personal M-Pesa', 'Ex.: Cartão pessoal': 'e.g. Personal card',
  'Número M-Pesa': 'M-Pesa number', 'Número Visa': 'Visa number', 'Nome no cartão': 'Name on card',
  'Mês de validade': 'Expiry month', 'Ano de validade': 'Expiry year',
  'A API guarda apenas os últimos quatro dígitos do cartão; não introduza o código CVV.': 'The API only stores the last four card digits; do not enter the CVV.',
  'Guardar': 'Save', 'Não tem métodos guardados': 'You have no saved payment methods',
  'Adicione um método para o selecionar no checkout.': 'Add a method to select at checkout.',
  'Visa terminando em': 'Visa ending in', 'Definir método padrão': 'Set as default',
  'Remover método': 'Remove payment method', 'Ir para o checkout': 'Go to checkout',
  'Os métodos guardados são associados apenas à sua conta. A API atual usa um processador de demonstração e não realiza cobranças reais.': 'Saved methods are linked only to your account. The current API uses a demo processor and does not charge real payments.',
  'Voltar aos produtos': 'Back to products', 'A carregar produto…': 'Loading product…',
  'Não foi possível carregar o produto': 'Could not load product', 'Sem stock': 'Out of stock',
  'em stock': 'in stock',
  'A adicionar…': 'Adding…',
  'Página não encontrada': 'Page not found',
  'O endereço que abriu não existe ou foi movido.': 'The address you opened does not exist or has moved.',
  'Voltar à loja': 'Back to shop', 'Entrar ou criar conta': 'Sign in or create an account',
  'Criar conta': 'Create account', 'Bem-vindo de volta': 'Welcome back',
  'Crie a sua conta': 'Create your account', 'Use o seu email ou telemóvel.': 'Use your email or mobile number.',
  'Leva menos de um minuto.': 'It takes less than a minute.',
  'Email ou telemóvel': 'Email or mobile number', 'Mínimo 8 caracteres, com letra maiúscula e minúscula': 'At least 8 characters, including uppercase and lowercase letters',
  'Mínimo 8 caracteres, com letra maiúscula e minúscula.': 'At least 8 characters, including uppercase and lowercase letters.',
  'Compre com calma, receba sem pressa.': 'Shop at your own pace, delivered when you need it.',
  'Guarde o carrinho, acompanhe encomendas e veja as novidades numa só conta.': 'Save your basket, track orders and see updates in one account.',
  'Entrega grátis em compras acima de 2000 MT': 'Free delivery on orders over 2000 MT',
  'Acompanhe cada encomenda': 'Track every order',
  '← Continuar sem conta': '← Continue as guest',
  'Pedido': 'Order', 'Encomenda': 'Order',
  'A carregar pedidos…': 'Loading orders…', 'Não foi possível carregar os pedidos': 'Could not load orders',
  'Ainda não fez nenhuma encomenda': 'You have not placed any orders yet.',
  'Pedido recebido': 'Order received', 'Estado': 'Status', 'Encomenda cancelada': 'Order cancelled',
  'Encomenda rejeitada.': 'Order rejected.', 'Motivo:': 'Reason:', 'Recebida': 'Received',
  'Aceite': 'Accepted', 'Em preparação': 'Preparing', 'Pronta para levantamento': 'Ready for pickup',
  'Em entrega': 'Out for delivery', 'Concluída': 'Completed', 'Produtos': 'Products',
  'Feita em': 'Placed on', 'Pedido #': 'Order #', 'Abrir pedido': 'Open order',
  'Compras': 'Shopping', 'Pagamentos': 'Payments', 'Terminar sessão': 'Sign out',
  'Idioma': 'Language', 'Tema': 'Theme', 'Aparência': 'Appearance',
  'Claro': 'Light', 'Escuro': 'Dark', 'Português': 'Portuguese', 'Inglês': 'English',
  'Preferências': 'Preferences', 'Modo claro': 'Light mode', 'Modo escuro': 'Dark mode',
  'Seleccione o idioma da loja.': 'Choose your store language.',
  'Escolha o tema visual da loja.': 'Choose the store appearance.',
  'Erro desconhecido.': 'Unknown error.', 'Filtros de pesquisa': 'Search filters',
  'Editar': 'Edit', 'Apagar': 'Delete', 'Levantamento na loja grátis.': 'Free in-store pickup.',
  'Quantidade de': 'Quantity of', 'Subtotal': 'Subtotal', 'Escolha um endereço de entrega.': 'Choose a delivery address.',
  'Total': 'Total', 'pedidos': 'orders',
  'Essenciais': 'Essentials', 'Categorias': 'Categories', 'Mostrar banner': 'Show banner',
  'de': 'of', 'Fechar': 'Close', 'Email (opcional)': 'Email (optional)', 'Palavra-passe': 'Password',
  'A carregar encomenda…': 'Loading order…', 'Não foi possível abrir a encomenda': 'Could not open order',
  'Endereço': 'Address', 'Remover o método': 'Remove payment method',
  'Palavra-passe alterada com sucesso.': 'Password changed successfully.', 'A sua fotografia': 'Your photo',
  'Favoritos': 'Favourites', 'Feito em Moçambique. © VirtualShop': 'Made in Mozambique. © VirtualShop',
  'por ler': 'unread', 'Navegação principal': 'Main navigation', 'Navegação dos banners': 'Banner navigation',
  'Sessão terminada neste dispositivo, mas a API não confirmou o logout:': 'Signed out on this device, but the API did not confirm sign-out:',
  'A carregar a sua conta': 'Loading your account', 'Rejeitada': 'Rejected', 'Cancelada': 'Cancelled',
  'Destaque': 'Featured',
  'Não foi possível abrir o perfil': 'Could not open profile',
  'Detalhes da encomenda': 'Order details',
  'Mudar para inglês': 'Switch to English', 'Switch to Portuguese': 'Switch to Portuguese',
  'Ativar modo escuro': 'Enable dark mode', 'Switch to light mode': 'Switch to light mode',
  'endereços': 'addresses', 'carrinho': 'basket', 'notificações': 'notifications',
  'contador de notificações': 'notification count', 'estatísticas': 'statistics',
};

export function translate(text: string, language: Language): string {
  if (language === 'pt') return text;
  return messages[text] ?? text;
}

type PreferencesContextValue = {
  language: Language;
  theme: Theme;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  t: (text: string) => string;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function storedValue<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const value = localStorage.getItem(key);
  return allowed.includes(value as T) ? value as T : fallback;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => storedValue(LANGUAGE_KEY, ['pt', 'en'], 'pt'));
  const [theme, setTheme] = useState<Theme>(() => storedValue(THEME_KEY, ['light', 'dark'], 'light'));

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.lang = language === 'pt' ? 'pt-PT' : 'en-GB';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [language, theme]);

  const value = useMemo(() => ({
    language,
    theme,
    setLanguage: (next: Language) => setLanguage(next),
    setTheme: (next: Theme) => setTheme(next),
    t: (text: string) => translate(text, language),
  }), [language, theme]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used within PreferencesProvider.');
  return value;
}
