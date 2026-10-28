const categoriesByType = Object.freeze({
  income: Object.freeze(['sales', 'other-income']),
  expense: Object.freeze([
    'seeds',
    'fertilizer',
    'feed',
    'veterinary',
    'medicine',
    'labour',
    'transport',
    'equipment',
    'utilities',
    'other-expense'
  ])
});

function normalizeFinanceEntry(input, now = new Date()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Enter a valid finance record.' };
  }

  const type = input.type;
  if (!Object.prototype.hasOwnProperty.call(categoriesByType, type)) {
    return { error: 'Choose income or expense.' };
  }

  if (!categoriesByType[type].includes(input.category)) {
    return { error: 'Choose a valid category for this record type.' };
  }

  if (typeof input.amount !== 'number' && (typeof input.amount !== 'string' || !/^\d+(\.\d{1,2})?$/.test(input.amount.trim()))) {
    return { error: 'Enter a valid amount.' };
  }
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000000) {
    return { error: 'Enter an amount greater than zero and no more than KES 1,000,000,000.' };
  }

  const description = typeof input.description === 'string' ? input.description.trim() : '';
  if (description.length > 120) {
    return { error: 'Description must be 120 characters or fewer.' };
  }

  if (typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { error: 'Choose a valid record date.' };
  }
  const date = new Date(`${input.date}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.date) {
    return { error: 'Choose a valid record date.' };
  }
  const latestAllowedDate = new Date(now);
  latestAllowedDate.setUTCHours(23, 59, 59, 999);
  latestAllowedDate.setUTCDate(latestAllowedDate.getUTCDate() + 1);
  if (date > latestAllowedDate) {
    return { error: 'Record date is too far in the future.' };
  }

  return {
    value: {
      type,
      category: input.category,
      description,
      amount: Math.round(amount * 100) / 100,
      date
    }
  };
}

module.exports = { categoriesByType, normalizeFinanceEntry };
