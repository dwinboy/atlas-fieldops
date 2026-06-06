export function createLocalId(prefix: string): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${randomPart}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
