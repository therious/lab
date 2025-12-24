/**
 * Utility to load Hebrew dictionary definitions from YAML file
 * Works in browser environment (Vite)
 */

import * as yaml from 'js-yaml';

let dictionaryCache: Map<number, RootDictionaryEntry> | null = null;
let loadingPromise: Promise<Map<number, RootDictionaryEntry>> | null = null;

// Initialize loading on module load
if (typeof window !== 'undefined') {
  // Browser environment - start loading immediately
  loadDictionaryDataAsync().catch(() => {
    // Silent fail - tooltips will just show definitions
  });
}

export interface DictionaryWord {
  h: string;  // Hebrew word with vowels
  e: string;  // English definition
  t?: string; // Part of speech (optional)
}

export interface RootDictionaryEntry {
  id: number;
  root: string;
  def: string;
  eg: DictionaryWord[];
}

interface DictionaryData {
  roots: RootDictionaryEntry[];
}

/**
 * Load dictionary data from YAML file (browser environment)
 */
async function loadDictionaryDataAsync(): Promise<Map<number, RootDictionaryEntry>> {
  if (dictionaryCache) {
    return dictionaryCache;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      // In Vite, use fetch to load YAML file
      // Try multiple possible paths (public folder and src folder)
      let response: Response | null = null;
      const paths = [
        '/root-dictionary-definitions.yaml',  // Public folder
        './root-dictionary-definitions.yaml',
      ];

      for (const yamlPath of paths) {
        try {
          response = await fetch(yamlPath);
          if (response.ok) break;
        } catch (e) {
          // Try next path
        }
      }

      if (!response || !response.ok) {
        console.warn('Dictionary file not found - tooltips will show definitions only');
        dictionaryCache = new Map();
        return dictionaryCache;
      }

      const fileContent = await response.text();
      const data = yaml.load(fileContent) as DictionaryData;
      
      if (!data || !data.roots || !Array.isArray(data.roots)) {
        console.warn('Invalid dictionary file format');
        dictionaryCache = new Map();
        return dictionaryCache;
      }

      // Create a map by root ID for fast lookup
      dictionaryCache = new Map();
      data.roots.forEach(entry => {
        dictionaryCache!.set(entry.id, entry);
      });

      console.log(`Loaded ${dictionaryCache.size} dictionary entries`);
      return dictionaryCache;
    } catch (error) {
      console.error('Error loading dictionary file:', error);
      dictionaryCache = new Map();
      return dictionaryCache;
    }
  })();

  return loadingPromise;
}

/**
 * Synchronous version (uses cached data, triggers async load on first call)
 */
function loadDictionaryData(): Map<number, RootDictionaryEntry> {
  if (dictionaryCache) {
    return dictionaryCache;
  }

  // Trigger async load (will populate cache)
  loadDictionaryDataAsync().catch(console.error);
  
  // Return empty map for now (will be populated async)
  return new Map();
}

/**
 * Get dictionary entry for a root by ID
 */
export function getDictionaryEntry(rootId: number): RootDictionaryEntry | undefined {
  const dictionary = loadDictionaryData();
  return dictionary.get(rootId);
}

/**
 * Get dictionary words for a root by ID
 */
export function getDictionaryWords(rootId: number): DictionaryWord[] {
  const entry = getDictionaryEntry(rootId);
  return entry?.eg || [];
}

/**
 * Format dictionary words for display in tooltip
 */
export function formatDictionaryWordsForTooltip(rootId: number): string {
  const words = getDictionaryWords(rootId);
  
  if (words.length === 0) {
    return '';
  }

  return words.map(word => {
    const partOfSpeech = word.t ? ` (${word.t})` : '';
    return `${word.h}${partOfSpeech}: ${word.e}`;
  }).join('\n');
}

/**
 * Get full tooltip text for a root (definition + dictionary words)
 */
export function getRootTooltip(rootId: number, definition: string): string {
  const words = formatDictionaryWordsForTooltip(rootId);
  
  if (!words) {
    return definition;
  }

  return `${definition}\n\nExample words:\n${words}`;
}

/**
 * Get tooltip for AG Grid (synchronous, uses cached data)
 */
export function getRootTooltipSync(rootId: number, definition: string): string {
  const words = formatDictionaryWordsForTooltip(rootId);
  
  if (!words) {
    return definition;
  }

  return `${definition}\n\nExample words:\n${words}`;
}

