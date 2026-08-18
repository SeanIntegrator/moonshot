export type OptionIdCarrier = {
  id: string;
  posOptionId: string | null;
};

/**
 * Reuse existing JSON option UUIDs when Square resyncs the same `posOptionId`.
 * Incoming options without a POS id (Moonshot-owned) keep their own ids.
 */
export function preserveOptionIds<T extends OptionIdCarrier>(existing: T[], incoming: T[]): T[] {
  const byPos = new Map<string, string>();
  for (const opt of existing) {
    if (opt.posOptionId) byPos.set(opt.posOptionId, opt.id);
  }
  return incoming.map((opt) => {
    if (!opt.posOptionId) return opt;
    const kept = byPos.get(opt.posOptionId);
    return kept && kept !== opt.id ? { ...opt, id: kept } : opt;
  });
}
