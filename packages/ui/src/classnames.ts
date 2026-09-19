import { clsx, type ClassValue } from 'clsx';
import { classProperties } from './class-properties.generated.js';

export type { ClassValue } from 'clsx';

/**
 * Compose native classes. Only owned finite classes have conflict metadata.
 * Unknown host classes are retained; arbitrary utility syntax is not interpreted.
 */
export function composeClasses(
  classes: string,
  properties: Readonly<Record<string, readonly number[]>>,
): string {
  const covered = new Set<number>();
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const name of classes.split(/\s+/u).filter(Boolean).reverse()) {
    if (seen.has(name)) continue;
    seen.add(name);
    const declarations = Object.hasOwn(properties, name) ? properties[name] : undefined;
    if (declarations?.length && declarations.every((atom) => covered.has(atom))) continue;
    kept.push(name);
    for (const atom of declarations ?? []) covered.add(atom);
  }
  return kept.reverse().join(' ');
}

export function cn(...inputs: ClassValue[]): string {
  return composeClasses(clsx(inputs), classProperties);
}
