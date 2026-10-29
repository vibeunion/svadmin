import type { Snippet } from 'svelte';

export interface TableColumn<T> {
  key: string;
  title: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  children?: TableColumn<T>[];
  cell?: Snippet<[unknown, T]>;
}
