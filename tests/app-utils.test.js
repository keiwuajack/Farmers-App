const test = require('node:test');
const assert = require('node:assert/strict');
const escapeHtml = require('../utils/html');
const { completedRevenuePipeline } = require('../utils/adminMetrics');
const { isValidOrderStatus } = require('../utils/orderStatus');
const { normalizeFinanceEntry } = require('../utils/farmFinance');

test('HTML escaping protects text and attribute contexts', () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('xss')">&`),
    '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;&amp;'
  );
});

test('completed revenue uses the persisted order totalAmount field', () => {
  assert.deepEqual(completedRevenuePipeline(), [
    { $match: { status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);
  assert.deepEqual(completedRevenuePipeline({ createdAt: { $gte: 'start' } })[0], {
    $match: { createdAt: { $gte: 'start' }, status: 'completed' }
  });
});

test('order status validation accepts only supported statuses', () => {
  assert.equal(isValidOrderStatus('shipped'), true);
  assert.equal(isValidOrderStatus('refund'), false);
  assert.equal(isValidOrderStatus(undefined), false);
});

test('farm finance entries accept valid income and expenses', () => {
  const normalized = normalizeFinanceEntry({
    type: 'expense',
    category: 'feed',
    description: '  Dairy feed  ',
    amount: '1250.50',
    date: '2026-10-15'
  }, new Date('2026-10-16T00:00:00.000Z'));

  assert.equal(normalized.error, undefined);
  assert.equal(normalized.value.type, 'expense');
  assert.equal(normalized.value.category, 'feed');
  assert.equal(normalized.value.description, 'Dairy feed');
  assert.equal(normalized.value.amount, 1250.5);
  assert.equal(normalized.value.date.toISOString(), '2026-10-15T00:00:00.000Z');
});

test('farm finance validation rejects unsupported, malformed and future records', () => {
  const now = new Date('2026-10-16T00:00:00.000Z');
  assert.match(normalizeFinanceEntry({ type: 'income', category: 'feed', amount: 20, date: '2026-10-15' }, now).error, /category/i);
  assert.match(normalizeFinanceEntry({ type: 'expense', category: 'feed', amount: true, date: '2026-10-15' }, now).error, /amount/i);
  assert.match(normalizeFinanceEntry({ type: 'income', category: 'sales', amount: 20, date: '2026-10-18' }, now).error, /future/i);
  assert.match(normalizeFinanceEntry({ type: 'income', category: 'sales', amount: 20, date: '2026-02-30' }, now).error, /date/i);
});
