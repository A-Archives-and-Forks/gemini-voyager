// Build-time reader for the bundled official catalog. Node-only: the store page
// imports the result through `pluginCatalog.data.ts`, so visitors get the cards
// in the prerendered HTML instead of fetching manifests from GitHub.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PluginManifest } from './pluginStore';

export type CatalogPlugin = PluginManifest & { official: boolean };

export const CATALOG_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../src/features/plugins/catalog',
);

interface MarketplaceEntry {
  name: string;
  source: string;
  official?: boolean;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Read every plugin listed in `marketplace.json`, keeping only the fields the
 * store renders: manifests also carry CSS and settings that would otherwise
 * ship in the page payload. A missing manifest fails the build rather than
 * silently dropping a card.
 */
export function readCatalog(catalogDir: string = CATALOG_DIR): CatalogPlugin[] {
  const market = readJson(resolve(catalogDir, 'marketplace.json')) as {
    plugins?: MarketplaceEntry[];
  };
  return (market.plugins ?? []).map((entry) => {
    const m = readJson(resolve(catalogDir, entry.source)) as PluginManifest;
    const i18n = m.i18n
      ? Object.fromEntries(
          Object.entries(m.i18n).map(([loc, v]) => [
            loc,
            { name: v.name, description: v.description },
          ]),
        )
      : undefined;
    return {
      id: m.id,
      name: m.name,
      version: m.version,
      description: m.description,
      category: m.category,
      homepage: m.homepage,
      matches: m.matches,
      theme: m.theme?.brand ? { brand: m.theme.brand } : undefined,
      i18n,
      official: entry.official === true,
    };
  });
}
