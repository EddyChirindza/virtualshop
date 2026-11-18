const test = require('node:test');
const assert = require('node:assert/strict');
const {
  bannerCreateSchema,
  bannerUpdateSchema,
} = require('../src/modules/banners/banner.validators');

function validBanner(overrides = {}) {
  return {
    name: 'Banner principal',
    title_pt: 'Promoção da semana',
    title_en: 'Weekly promotion',
    image_url: '/uploads/banners/banner.jpg',
    ...overrides,
  };
}

function firstMessage(schema, value) {
  try {
    schema.parse(value);
    return null;
  } catch (error) {
    return error.issues[0].path.join('.') + ': ' + error.issues[0].message;
  }
}

test('banner válido com valores por omissão', () => {
  const parsed = bannerCreateSchema.parse(validBanner());
  assert.equal(parsed.background_color, '#111827');
  assert.equal(parsed.title_color, '#FFFFFF');
  assert.equal(parsed.subtitle_color, '#E5E7EB');
  assert.equal(parsed.alignment, 'left');
  assert.equal(parsed.overlay_opacity, 0);
  assert.equal(parsed.banner_type, 'promotion');
  assert.equal(parsed.destination_type, 'none');
  assert.equal(parsed.is_active, true);
  assert.equal(parsed.sort_order, 0);
});

test('campos obrigatórios e limites', () => {
  assert.match(firstMessage(bannerCreateSchema, validBanner({ name: '' })) ?? '', /name/);
  assert.match(firstMessage(bannerCreateSchema, validBanner({ title_pt: undefined })) ?? '', /title_pt/);
  assert.match(firstMessage(bannerCreateSchema, validBanner({ name: 'a'.repeat(101) })) ?? '', /name/);
  assert.match(firstMessage(bannerCreateSchema, validBanner({ title_pt: 'a'.repeat(151) })) ?? '', /title_pt/);
  assert.equal(firstMessage(bannerCreateSchema, validBanner({ name: undefined, title_pt: undefined })), 'name: O nome é obrigatório.');
});

test('cores, opacidade, alinhamento e tipos são validados', () => {
  assert.match(firstMessage(bannerCreateSchema, validBanner({ background_color: '#123' })) ?? '', /background_color/);
  assert.match(firstMessage(bannerCreateSchema, validBanner({ button_color: 'red' })) ?? '', /button_color/);
  assert.match(firstMessage(bannerCreateSchema, validBanner({ overlay_opacity: 1.2 })) ?? '', /overlay_opacity/);
  assert.match(firstMessage(bannerCreateSchema, validBanner({ overlay_opacity: -0.1 })) ?? '', /overlay_opacity/);
  assert.match(firstMessage(bannerCreateSchema, validBanner({ alignment: 'top' })) ?? '', /alignment/);
  assert.match(firstMessage(bannerCreateSchema, validBanner({ banner_type: 'sale' })) ?? '', /banner_type/);
  assert.match(firstMessage(bannerCreateSchema, validBanner({ destination_type: 'external' })) ?? '', /destination_type/);
  assert.match(firstMessage(bannerCreateSchema, validBanner({ is_active: 'true' })) ?? '', /is_active/);
});

test('propriedades inesperadas são rejeitadas', () => {
  assert.match(firstMessage(bannerCreateSchema, validBanner({ internal_flag: true })) ?? '', /Unrecognized key|unexpected/i);
  assert.match(firstMessage(bannerUpdateSchema, { unknown: 1 }) ?? '', /Unrecognized key|unexpected/i);
});

test('período de publicação inválido é rejeitado', () => {
  const message = firstMessage(bannerCreateSchema, validBanner({
    starts_at: '2026-01-02T10:00:00Z',
    expires_at: '2026-01-01T10:00:00Z',
  }));
  assert.match(message ?? '', /expires_at/);
  assert.equal(firstMessage(bannerCreateSchema, validBanner({
    starts_at: '2026-01-01T10:00:00Z',
    expires_at: '2026-01-02T10:00:00Z',
  })), null);
});

test('destino none não aceita campos de outros destinos', () => {
  assert.match(firstMessage(bannerCreateSchema, validBanner({ product_id: 1 })) ?? '', /product_id/);
  assert.match(firstMessage(bannerCreateSchema, validBanner({ category_id: 1 })) ?? '', /category_id/);
  assert.match(firstMessage(bannerCreateSchema, validBanner({ destination_url: '/promo' })) ?? '', /destination_url/);
  assert.match(firstMessage(bannerCreateSchema, validBanner({ products: [{ product_id: 1 }] })) ?? '', /products/);
});

test('destino product e category exigem a referência correta', () => {
  assert.match(firstMessage(bannerCreateSchema, validBanner({ destination_type: 'product' })) ?? '', /product_id/);
  assert.equal(firstMessage(bannerCreateSchema, validBanner({ destination_type: 'product', product_id: 3 })), null);
  assert.match(firstMessage(bannerCreateSchema, validBanner({ destination_type: 'category' })) ?? '', /category_id/);
  assert.equal(firstMessage(bannerCreateSchema, validBanner({ destination_type: 'category', category_id: 4 })), null);
  assert.match(firstMessage(bannerCreateSchema, validBanner({ destination_type: 'product', product_id: 3, category_id: 4 })) ?? '', /category_id/);
});

test('destino url aceita http(s) e caminhos internos, rejeitando esquemas perigosos', () => {
  assert.equal(firstMessage(bannerCreateSchema, validBanner({ destination_type: 'url', destination_url: 'https://example.com/promo' })), null);
  assert.equal(firstMessage(bannerCreateSchema, validBanner({ destination_type: 'url', destination_url: '/categorias/1' })), null);
  for (const url of ['javascript:alert(1)', 'data:text/html,<script>', 'file:///etc/passwd', '//evil.example', 'ftp://example.com', 'not a url']) {
    assert.match(firstMessage(bannerCreateSchema, validBanner({ destination_type: 'url', destination_url: url })) ?? '', /destination_url/, url);
  }
  assert.match(firstMessage(bannerCreateSchema, validBanner({ destination_type: 'url' })) ?? '', /destination_url/);
});

test('destino product_list exige produtos quando ativo e rejeita duplicados', () => {
  assert.match(firstMessage(bannerCreateSchema, validBanner({ destination_type: 'product_list' })) ?? '', /products/);
  assert.match(firstMessage(bannerCreateSchema, validBanner({ destination_type: 'product_list', is_active: true, products: [] })) ?? '', /products/);
  assert.equal(firstMessage(bannerCreateSchema, validBanner({ destination_type: 'product_list', is_active: false, products: [] })), null);
  assert.equal(firstMessage(bannerCreateSchema, validBanner({
    destination_type: 'product_list',
    products: [{ product_id: 2, sort_order: 0 }, { product_id: 1, sort_order: 1 }],
  })), null);
  assert.match(firstMessage(bannerCreateSchema, validBanner({
    destination_type: 'product_list',
    products: [{ product_id: 2 }, { product_id: 2 }],
  })) ?? '', /duplicados/);
  assert.match(firstMessage(bannerCreateSchema, validBanner({
    destination_type: 'product_list',
    product_id: 2,
    products: [{ product_id: 2 }],
  })) ?? '', /product_id/);
});

test('imagens com URL insegura são rejeitadas', () => {
  assert.match(firstMessage(bannerCreateSchema, validBanner({ image_url: 'javascript:alert(1)' })) ?? '', /image_url/);
  assert.match(firstMessage(bannerCreateSchema, validBanner({ mobile_image_url: 'data:image/png;base64,AA' })) ?? '', /mobile_image_url/);
  assert.equal(firstMessage(bannerCreateSchema, validBanner({ image_url: 'https://example.com/a.jpg', mobile_image_url: '/uploads/banners/m.jpg' })), null);
});

test('update parcial não injecta valores por omissão', () => {
  assert.deepEqual(bannerUpdateSchema.parse({ is_active: false }), { is_active: false });
  assert.deepEqual(bannerUpdateSchema.parse({ sort_order: 3 }), { sort_order: 3 });
  assert.match(firstMessage(bannerUpdateSchema, {}) ?? '', /pelo menos um campo/);
});
