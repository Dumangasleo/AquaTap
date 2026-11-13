import { twMerge } from 'tailwind-merge';

type ClassValue = string | false | null | undefined;

/**
 * Joins Tailwind class names and lets later classes win over earlier ones
 * (so `cn('p-4', isCompact && 'p-2')` gives `p-2`).
 */
export function cn(...classNames: ClassValue[]): string {
  return twMerge(classNames.filter(Boolean).join(' '));
}
