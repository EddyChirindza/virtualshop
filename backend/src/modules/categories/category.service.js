// ─────────────────────────────────────────────
// VirtualShop API — Serviço de categorias
// ─────────────────────────────────────────────
const { query } = require('../../config/db');
const { ApiError } = require('../../middlewares/error.middleware');

async function getAll() {
  const { rows } = await query(`SELECT id, name, slug, icon_url, parent_id FROM categories ORDER BY name ASC`);
  return rows;
}

async function getTree() {
  const flat = await getAll();
  const byId = new Map(flat.map((category) => [category.id, { ...category, children: [] }]));
  const roots = [];
  for (const category of byId.values()) {
    if (category.parent_id && byId.has(category.parent_id)) byId.get(category.parent_id).children.push(category);
    else roots.push(category);
  }
  return roots;
}

async function ensureParentExists(parentId) {
  if (parentId == null) return;
  const { rows } = await query('SELECT id FROM categories WHERE id = $1', [parentId]);
  if (!rows[0]) throw new ApiError(400, 'A categoria principal selecionada não existe.');
}

async function create(fields) {
  await ensureParentExists(fields.parent_id);
  const { rows } = await query(
    `INSERT INTO categories (name, slug, icon_url, parent_id) VALUES ($1, $2, $3, $4)
     RETURNING id, name, slug, icon_url, parent_id`,
    [fields.name, fields.slug, fields.icon_url ?? null, fields.parent_id ?? null]
  );
  return rows[0];
}

async function update(id, fields) {
  if (Object.hasOwn(fields, 'parent_id')) {
    if (fields.parent_id === id) throw new ApiError(400, 'Uma categoria não pode ser sua própria subcategoria.');
    await ensureParentExists(fields.parent_id);
    if (fields.parent_id != null) {
      const { rows } = await query(
        `WITH RECURSIVE descendants(id) AS (
           SELECT id FROM categories WHERE parent_id = $1
           UNION
           SELECT c.id FROM categories c JOIN descendants d ON c.parent_id = d.id
         ) SELECT id FROM descendants WHERE id = $2 LIMIT 1`,
        [id, fields.parent_id]
      );
      if (rows[0]) throw new ApiError(400, 'Esta alteração criaria um ciclo na árvore de categorias.');
    }
  }
  const columns = { name: 'name', slug: 'slug', icon_url: 'icon_url', parent_id: 'parent_id' };
  const values = [];
  const assignments = [];
  for (const [key, column] of Object.entries(columns)) {
    if (Object.hasOwn(fields, key)) { values.push(fields[key]); assignments.push(`${column} = $${values.length}`); }
  }
  values.push(id);
  const { rows } = await query(
    `UPDATE categories SET ${assignments.join(', ')} WHERE id = $${values.length}
     RETURNING id, name, slug, icon_url, parent_id`, values
  );
  if (!rows[0]) throw new ApiError(404, 'Categoria não encontrada.');
  return rows[0];
}

async function remove(id) {
  const { rows } = await query(
    `SELECT EXISTS(SELECT 1 FROM categories WHERE parent_id = $1) AS has_children,
            EXISTS(SELECT 1 FROM products WHERE category_id = $1) AS has_products`, [id]
  );
  if (!rows[0]) throw new ApiError(404, 'Categoria não encontrada.');
  if (rows[0].has_children || rows[0].has_products) {
    throw new ApiError(409, 'Move ou elimina primeiro as subcategorias e produtos associados.');
  }
  const deleted = await query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
  if (!deleted.rows[0]) throw new ApiError(404, 'Categoria não encontrada.');
}

module.exports = { getAll, getTree, create, update, remove };
