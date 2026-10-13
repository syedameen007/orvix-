export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  const left = normalizeSearchText(a);
  const right = normalizeSearchText(b);
  const matrix = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));

  for (let i = 0; i <= left.length; i += 1) matrix[i]![0] = i;
  for (let j = 0; j <= right.length; j += 1) matrix[0]![j] = j;

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost
      );
    }
  }

  return matrix[left.length]![right.length]!;
}

export function rankSearchCandidate(query: string, candidate: string, aliases: string[] = []): number {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const haystacks = [candidate, ...aliases].map(normalizeSearchText).filter(Boolean);
  let best = 0;

  for (const haystack of haystacks) {
    if (haystack === normalizedQuery) best = Math.max(best, 100);
    if (haystack.startsWith(normalizedQuery)) best = Math.max(best, 88);
    if (haystack.includes(normalizedQuery)) best = Math.max(best, 74);

    const words = haystack.split(" ");
    if (queryTokens.length > 1 && queryTokens.every((token) => words.some((word) => word.startsWith(token)))) {
      best = Math.max(best, 82);
    }
    if (queryTokens.length > 1 && queryTokens.every((token) => haystack.includes(token))) {
      best = Math.max(best, 76);
    }

    for (const word of words) {
      for (const token of queryTokens) {
        if (word === token) best = Math.max(best, 72);
        if (word.startsWith(token) && token.length >= 3) best = Math.max(best, 64);
      }
      const distance = levenshtein(normalizedQuery, word);
      if (distance <= 1) best = Math.max(best, 68);
      if (distance === 2 && normalizedQuery.length >= 5) best = Math.max(best, 52);
    }
  }

  return best;
}
