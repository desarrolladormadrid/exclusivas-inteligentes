function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  return digits;
}

function phoneCandidates(value) {
  const normalized = normalizePhone(value);
  if (!normalized) return [];
  const candidates = new Set([normalized]);
  if (normalized.startsWith("34") && normalized.length === 11) candidates.add(normalized.slice(2));
  if (normalized.length === 9) candidates.add(`34${normalized}`);
  return [...candidates];
}

function matchesPhone(value, candidate) {
  const left = phoneCandidates(value);
  const right = phoneCandidates(candidate);
  return left.some((item) => right.includes(item));
}

module.exports = { normalizePhone, phoneCandidates, matchesPhone };
