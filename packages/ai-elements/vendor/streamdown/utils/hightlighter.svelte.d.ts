import type { ThemedToken, ThemeRegistration } from 'shiki';
import type { HighlighterCore } from 'shiki/core';
import { SvelteMap } from 'svelte/reactivity';
import { type LanguageInfo } from './bundledLanguages.js';
export type Highlighter = HighlighterCore;
declare class HighlighterManager {
    loadedLanguages: SvelteMap<string, boolean | Promise<void>>;
    highlighter: any;
    customLanguages: Set<string>;
    languageLoaders: Map<string, () => Promise<any>>;
    additionalThemes: Record<string, ThemeRegistration>;
    constructor(languages: LanguageInfo[], additionalThemes?: Record<string, ThemeRegistration>, additionalLanguages?: LanguageInfo[]);
    private loadHighlighter;
    private isThemeAvailable;
    private loadLanguage;
    private isLanguageSupported;
    isReady(theme: string, language: string | undefined): boolean;
    /**
     * Ensures the highlighter is ready for the given theme and language.
     */
    load(theme: string, language: string | undefined): Promise<void>;
    /**
     * Highlights code synchronously. Must call isReady() first.
     * Returns plaintext tokens for unsupported languages.
     */
    highlightCode(code: string, language: string | undefined, theme: string): ThemedToken[][];
    static create(languages?: LanguageInfo[], additionalThemes?: Record<string, ThemeRegistration>, additionalLanguages?: LanguageInfo[]): HighlighterManager;
}
export { HighlighterManager };
export declare const languageExtensionMap: Record<string, string>;
