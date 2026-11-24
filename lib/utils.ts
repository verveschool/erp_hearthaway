import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Historical records may have missing or numeric text values. Searching must
// never interrupt the workspace because a single old record is incomplete.
export function matchesSearch(query: string, fields: unknown[]): boolean {
  const term = query.trim().toLowerCase();
  return !term || fields.some(value => (typeof value === 'string' || typeof value === 'number') && String(value).toLowerCase().includes(term));
}
