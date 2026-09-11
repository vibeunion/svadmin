import { definedOptions } from '@svadmin/core/options';
/**
 * @svadmin/editor — Extension presets
 *
 * Pre-configured extension bundles for different use cases.
 * Users can pick a preset or compose their own extension array.
 */

import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import type { AnyExtension } from '@tiptap/core';
import type { createLowlight } from 'lowlight';

export type Lowlight = ReturnType<typeof createLowlight>;

export interface EditorPresetOptions {
  /** Placeholder text */
  placeholder?: string;
  /** Max character count (0 = unlimited) */
  maxLength?: number;
  /** Enable code block syntax highlighting */
  codeHighlight?: boolean;
  /** lowlight instance (required if codeHighlight is true) */
  lowlight?: Lowlight;
}

/**
 * Full preset: all extensions enabled.
 * Suitable for content management, article editing, knowledge bases.
 */
export function fullPreset(options: EditorPresetOptions = {}): AnyExtension[] {
  const extensions: AnyExtension[] = [
    StarterKit.configure(definedOptions({
      // Disable default code block in favor of CodeBlockLowlight
      codeBlock: options.codeHighlight ? false : undefined,
    })),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: {
        rel: 'noopener noreferrer',
        target: '_blank',
      },
    }),
    Image.configure({
      allowBase64: true,
      HTMLAttributes: {
        loading: 'lazy',
      },
    }),
    Subscript,
    Superscript,
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'svadmin-table',
      },
    }),
    TableRow,
    TableHeader,
    TableCell,
    Typography,
    CharacterCount.configure({
      limit: options.maxLength || undefined,
    }),
  ];

  if (options.placeholder) {
    extensions.push(
      Placeholder.configure({
        placeholder: options.placeholder,
      })
    );
  }

  if (options.codeHighlight && options.lowlight) {
    extensions.push(
      CodeBlockLowlight.configure({
        lowlight: options.lowlight,
      })
    );
  }

  return extensions;
}

/**
 * Minimal preset: basic text formatting only.
 * Suitable for comments, short descriptions, inline editing.
 */
export function minimalPreset(options: EditorPresetOptions = {}): AnyExtension[] {
  const extensions: AnyExtension[] = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
    }),
    CharacterCount.configure({
      limit: options.maxLength || undefined,
    }),
  ];

  if (options.placeholder) {
    extensions.push(
      Placeholder.configure({
        placeholder: options.placeholder,
      })
    );
  }

  return extensions;
}

/**
 * Prose preset: optimized for long-form writing.
 * Includes typography, highlights, but no tables.
 */
export function prosePreset(options: EditorPresetOptions = {}): AnyExtension[] {
  const extensions: AnyExtension[] = [
    StarterKit.configure(definedOptions({
      codeBlock: options.codeHighlight ? false : undefined,
    })),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
    }),
    Image.configure({ allowBase64: true }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Typography,
    CharacterCount.configure({
      limit: options.maxLength || undefined,
    }),
  ];

  if (options.placeholder) {
    extensions.push(
      Placeholder.configure({
        placeholder: options.placeholder,
      })
    );
  }

  if (options.codeHighlight && options.lowlight) {
    extensions.push(
      CodeBlockLowlight.configure({
        lowlight: options.lowlight,
      })
    );
  }

  return extensions;
}

export {
  // Re-export individual extensions for custom composition
  StarterKit,
  Underline,
  TextAlign,
  TextStyle,
  Color,
  Highlight,
  Link,
  Image,
  Placeholder,
  CharacterCount,
  Typography,
  Subscript,
  Superscript,
  TaskList,
  TaskItem,
  Table,
  TableRow,
  TableHeader,
  TableCell,
  CodeBlockLowlight,
};
