function completedRevenuePipeline(additionalMatch = {}) {
  return [
    { $match: { ...additionalMatch, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ];
}

module.exports = { completedRevenuePipeline };
