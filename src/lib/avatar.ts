const TONES = [
  'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200',
  'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200',
  'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-200',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-200',
] as const;

export function avatarTone(name?: string | null): string {
  const value = (name ?? '').trim();
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 997;
  }
  return TONES[hash % TONES.length];
}

export function initials(name?: string | null): string {
  const parts = (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase('de-DE');
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase('de-DE');
}
