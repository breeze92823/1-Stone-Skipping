// Skill purchase buttons, backed by real Bux purchases: the sku is passed to
// the SDK and the price comes from the catalog registered for GAME_SLUG on
// bloxity.io — these placeholder skus need to match that catalog.
export const BOOSTS = [
  { label: '+10K', amount: 10_000, cost: 7, className: 'boost-yellow', sku: 'skill_boost_10k' },
  { label: '+100K', amount: 100_000, cost: 30, className: 'boost-red', sku: 'skill_boost_100k' },
  { label: '+1M', amount: 1_000_000, cost: 55, className: 'boost-rainbow', sku: 'skill_boost_1m' },
]
