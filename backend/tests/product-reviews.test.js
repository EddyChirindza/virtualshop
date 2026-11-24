const test = require('node:test');
const assert = require('node:assert/strict');

const { pool, query } = require('../src/config/db');
const productService = require('../src/modules/products/product.service');
const adminService = require('../src/modules/admin/admin.service');
const { assertConnectedTestDatabase } = require('../test-support/assert-test-database');

async function resetDb() {
  await assertConnectedTestDatabase(pool);
  await query('DELETE FROM product_review_votes');
  await query('DELETE FROM product_reviews');
  await query('DELETE FROM products');
  await query('DELETE FROM categories');
  await query('DELETE FROM users');

  const category = await query(
    `INSERT INTO categories (name, slug) VALUES ('Reviews', 'reviews') RETURNING id`
  );
  const users = await query(
    `INSERT INTO users (full_name, phone, email, password_hash, role)
     VALUES
       ('Cliente Um', '+351910000001', 'review.one@example.com', 'unused', 'customer'),
       ('Cliente Dois', '+351910000002', 'review.two@example.com', 'unused', 'customer'),
       ('Admin Reviews', '+351910000003', 'review.admin@example.com', 'unused', 'admin')
     RETURNING id, role`
  );
  const product = await query(
    `INSERT INTO products (name, description, price, stock, category_id, rating)
     VALUES ('Produto Avaliado', 'Teste', 100, 10, $1, 0)
     RETURNING id`,
    [category.rows[0].id]
  );

  return {
    productId: product.rows[0].id,
    userId: users.rows.find((row) => row.role === 'customer').id,
    otherUserId: users.rows.filter((row) => row.role === 'customer')[1].id,
  };
}

test('review create, edit, delete and average stay consistent', async () => {
  const { productId, userId, otherUserId } = await resetDb();

  await productService.saveReview(productId, userId, 5, 'Excelente');
  let product = await query('SELECT rating FROM products WHERE id = $1', [productId]);
  assert.equal(Number(product.rows[0].rating), 5);

  await productService.saveReview(productId, otherUserId, 3, null);
  product = await query('SELECT rating FROM products WHERE id = $1', [productId]);
  assert.equal(Number(product.rows[0].rating), 4);

  await productService.saveReview(productId, userId, 1, null);
  product = await query('SELECT rating FROM products WHERE id = $1', [productId]);
  assert.equal(Number(product.rows[0].rating), 2);

  await productService.deleteReview(productId, userId);
  product = await query('SELECT rating FROM products WHERE id = $1', [productId]);
  assert.equal(Number(product.rows[0].rating), 3);

  await productService.deleteReview(productId, otherUserId);
  product = await query('SELECT rating FROM products WHERE id = $1', [productId]);
  assert.equal(Number(product.rows[0].rating), 0);
});

test('review ownership, comments and vote rules are enforced', async () => {
  const { productId, userId, otherUserId } = await resetDb();

  await productService.saveReview(productId, userId, 4, 'Comentário próprio');
  const review = (await productService.getReviews(productId, userId)).items[0];

  await assert.rejects(
    () => productService.setReviewVote(productId, review.id, userId, 'like'),
    (error) => error.status === 403
  );

  await productService.saveReview(productId, otherUserId, 5, null);
  const noCommentReview = (await productService.getReviews(productId, otherUserId)).ownReview;
  await assert.rejects(
    () => productService.setReviewVote(productId, noCommentReview.id, userId, 'like'),
    (error) => error.status === 400
  );

  await productService.saveReview(productId, userId, 4, 'Comentário próprio');
  await productService.saveReview(productId, otherUserId, 5, 'Outro comentário');
  const otherReview = (await productService.getReviews(productId, userId)).items.find((item) => item.isOwn === false);
  await productService.setReviewVote(productId, otherReview.id, userId, 'like');
  let vote = await productService.setReviewVote(productId, otherReview.id, userId, 'dislike');
  assert.deepEqual(vote, { likeCount: 0, dislikeCount: 1, userVote: 'dislike' });

  await productService.deleteReview(productId, otherUserId);
  const votes = await query('SELECT COUNT(*)::int AS count FROM product_review_votes WHERE review_id = $1', [otherReview.id]);
  assert.equal(votes.rows[0].count, 0);
});

test('admin report filters and administrative deletion recalculate rating', async () => {
  const { productId, userId, otherUserId } = await resetDb();
  await productService.saveReview(productId, userId, 5, 'Muito bom');
  await productService.saveReview(productId, otherUserId, 2, 'Pode melhorar');

  const report = await adminService.getProductReviewReport({ page: 1, limit: 50, rating: 5 });
  assert.equal(report.total, 1);
  assert.equal(report.reviews[0].rating, 5);

  await adminService.deleteProductReview(report.reviews[0].id);
  const product = await query('SELECT rating FROM products WHERE id = $1', [productId]);
  assert.equal(Number(product.rows[0].rating), 2);
});
