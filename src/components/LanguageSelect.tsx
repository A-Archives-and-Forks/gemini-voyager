import React from 'react';

import { ChevronDown, Globe } from 'lucide-react';

import { useLanguage } from '../contexts/LanguageContext';
import { APP_LANGUAGES, APP_LANGUAGE_LABELS, normalizeLanguage } from '../utils/language';

/**
 * Pick the Voyager language from a list. Writes the same setting as the
 * popup's toggle, so the choice carries into the popup, the in-page features
 * and plugins.
 */
export const LanguageSelect: React.FC<{ className?: string }> = ({ className }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <label className={['relative inline-flex items-center', className ?? ''].join(' ')}>
      <Globe
        className="text-muted-foreground pointer-events-none absolute start-2.5 h-4 w-4"
        aria-hidden="true"
      />
      <select
        value={language}
        onChange={(event) => setLanguage(normalizeLanguage(event.target.value))}
        aria-label="Language"
        className="bg-card border-border/60 text-foreground focus-visible:ring-ring h-9 cursor-pointer appearance-none rounded-lg border ps-8 pe-8 text-sm shadow-sm outline-none focus-visible:ring-2"
      >
        {APP_LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {APP_LANGUAGE_LABELS[code]}
          </option>
        ))}
      </select>
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute end-2.5 h-4 w-4"
        aria-hidden="true"
      />
    </label>
  );
};
