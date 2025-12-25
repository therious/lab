/**
 * Data Worker - Holds all application data and serves it on demand
 * This worker maintains roots, dictionary, and similarity grades data
 */

import { roots } from '../roots/roots';
import * as yaml from 'js-yaml';

// Data caches
let dictionaryCache: Map<number, any> | null = null;
let dictionaryLoadingPromise: Promise<Map<number, any>> | null = null;

interface DictionaryData {
  roots: Array<{
    id: number;
    root: string;
    def: string;
    eg: Array<{
      h: string;
      e: string;
      t?: string;
    }>;
  }>;
}

/**
 * Load dictionary data in worker
 */
async function loadDictionaryInWorker(): Promise<Map<number, any>> {
  if (dictionaryCache) {
    return dictionaryCache;
  }

  if (dictionaryLoadingPromise) {
    return dictionaryLoadingPromise;
  }

  dictionaryLoadingPromise = (async () => {
    try {
      const response = await fetch('/root-dictionary-definitions.yaml');
      if (!response.ok) {
        console.warn('Dictionary file not found in worker');
        dictionaryCache = new Map();
        return dictionaryCache;
      }

      const fileContent = await response.text();
      const data = yaml.load(fileContent) as DictionaryData;

      if (!data || !data.roots || !Array.isArray(data.roots)) {
        console.warn('Invalid dictionary file format in worker');
        dictionaryCache = new Map();
        return dictionaryCache;
      }

      dictionaryCache = new Map();
      data.roots.forEach(entry => {
        dictionaryCache!.set(entry.id, entry);
      });

      console.log(`Worker loaded ${dictionaryCache.size} dictionary entries`);
      return dictionaryCache;
    } catch (error) {
      console.error('Error loading dictionary in worker:', error);
      dictionaryCache = new Map();
      return dictionaryCache;
    }
  })();

  return dictionaryLoadingPromise;
}

/**
 * Get dictionary entry for a root
 */
function getDictionaryEntry(rootId: number): any {
  if (!dictionaryCache) {
    // Trigger async load
    loadDictionaryInWorker().catch(console.error);
    return undefined;
  }
  return dictionaryCache.get(rootId);
}

/**
 * Get dictionary words for a root
 */
function getDictionaryWords(rootId: number): Array<{ h: string; e: string; t?: string }> {
  const entry = getDictionaryEntry(rootId);
  return entry?.eg || [];
}

/**
 * Format dictionary words for tooltip
 */
function formatDictionaryWordsForTooltip(rootId: number): string {
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
 * Get full tooltip text for a root
 */
function getRootTooltip(rootId: number, definition: string): string {
  const words = formatDictionaryWordsForTooltip(rootId);
  if (!words) {
    return definition;
  }
  return `${definition}\n\nExample words:\n${words}`;
}

// Message handler
self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'getAllRows') {
    // Return all roots data for AG Grid
    // Transform roots to include examples field
    const rowData = roots.map(root => {
      const dictionaryWords = getDictionaryWords(root.id);
      const examples = dictionaryWords.map(word => {
        const partOfSpeech = word.t ? ` (${word.t})` : '';
        return `${word.h}${partOfSpeech}: ${word.e}`;
      }).join(' | ');

      return {
        ...root,
        examples,
      };
    });

    self.postMessage({
      type: 'getAllRowsResult',
      payload: { rowData },
    });
  } else if (type === 'getDictionaryTooltip') {
    // Get dictionary tooltip for a specific root
    const { rootId, definition } = payload;
    const tooltip = getRootTooltip(rootId, definition);
    self.postMessage({
      type: 'getDictionaryTooltipResult',
      payload: { rootId, tooltip },
    });
  } else if (type === 'getDictionaryWords') {
    // Get dictionary words for a specific root
    const { rootId } = payload;
    const words = getDictionaryWords(rootId);
    self.postMessage({
      type: 'getDictionaryWordsResult',
      payload: { rootId, words },
    });
  } else if (type === 'getAllRoots') {
    // Return all roots (for graph visualization)
    self.postMessage({
      type: 'getAllRootsResult',
      payload: { roots },
    });
  } else if (type === 'loadDictionary') {
    // Trigger dictionary loading
    loadDictionaryInWorker().then(() => {
      self.postMessage({
        type: 'loadDictionaryResult',
        payload: { success: true },
      });
    }).catch((error) => {
      self.postMessage({
        type: 'loadDictionaryResult',
        payload: { success: false, error: error.message },
      });
    });
  }
};

// Initialize dictionary loading
loadDictionaryInWorker().catch(console.error);


