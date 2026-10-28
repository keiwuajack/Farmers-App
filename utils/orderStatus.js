const validOrderStatuses = Object.freeze([
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'completed'
]);

function isValidOrderStatus(status) {
  return validOrderStatuses.includes(status);
}

module.exports = { validOrderStatuses, isValidOrderStatus };
