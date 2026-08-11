/** Tiny class-name joiner (no tailwind-merge dependency in this template). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
