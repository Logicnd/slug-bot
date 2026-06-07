const pendingTrades = new Map();

function makeTradeId() {
  return `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function createTrade(trade) {
  const id = makeTradeId();
  const payload = {
    id,
    createdAt: Date.now(),
    ...trade,
  };
  pendingTrades.set(id, payload);
  return payload;
}

function getTrade(id) {
  return pendingTrades.get(id) || null;
}

function deleteTrade(id) {
  return pendingTrades.delete(id);
}

function getUserTrades(userId) {
  return Array.from(pendingTrades.values()).filter(
    (t) => t.fromUserId === userId || t.toUserId === userId,
  );
}

function pruneTrades(maxAgeMs = 10 * 60 * 1000) {
  const now = Date.now();
  for (const [id, trade] of pendingTrades.entries()) {
    if (now - trade.createdAt > maxAgeMs) {
      pendingTrades.delete(id);
    }
  }
}

module.exports = {
  createTrade,
  getTrade,
  deleteTrade,
  getUserTrades,
  pruneTrades,
};
