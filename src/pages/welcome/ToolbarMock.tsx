import React from 'react';

import { Check, Eye, Pin, Puzzle, Settings } from 'lucide-react';

import type { ToolbarPinBrowser } from '@/features/onboarding/toolbarPin';

const ACTION_ICON: Record<Exclude<ToolbarPinBrowser, 'unsupported'>, React.ReactNode> = {
  chrome: <Pin className="h-3.5 w-3.5" />,
  edge: <Eye className="h-3.5 w-3.5" />,
  firefox: <Settings className="h-3.5 w-3.5" />,
};

interface ToolbarMockProps {
  browser: Exclude<ToolbarPinBrowser, 'unsupported'>;
  pinned: boolean;
}

/**
 * A miniature of the browser chrome: address bar, extensions button and the
 * extensions menu with Voyager's row. Once the real toolbar reports the pin,
 * the menu folds away and Voyager's icon appears next to the button, so the
 * mock shows the user what just changed above the page.
 */
export function ToolbarMock({ browser, pinned }: ToolbarMockProps) {
  return (
    <div
      aria-hidden="true"
      className="bg-secondary/50 relative h-[148px] overflow-hidden rounded-xl select-none"
    >
      <div className="bg-card border-border/60 relative flex h-11 items-center gap-2 border-b px-3">
        <div className="flex gap-1.5">
          <span className="bg-border h-2.5 w-2.5 rounded-full" />
          <span className="bg-border h-2.5 w-2.5 rounded-full" />
          <span className="bg-border h-2.5 w-2.5 rounded-full" />
        </div>
        <div className="bg-secondary ms-2 h-6 flex-1 rounded-full" />
        <div className="relative flex h-7 w-7 items-center justify-center">
          <img
            src="/icon-32.png"
            alt=""
            width={20}
            height={20}
            className={[
              'gv-welcome-fade absolute rounded-md',
              pinned ? 'scale-100 opacity-100 blur-0' : 'scale-50 opacity-0 blur-[4px]',
            ].join(' ')}
          />
          <span
            className={[
              'gv-welcome-fade bg-primary text-primary-foreground absolute -top-0.5 -end-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full',
              pinned ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
            ].join(' ')}
          >
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        </div>
        <div
          className={[
            'text-foreground/70 relative flex h-7 w-7 items-center justify-center rounded-full',
            pinned ? '' : 'gv-welcome-ring',
          ].join(' ')}
        >
          <Puzzle className="h-4 w-4" />
        </div>
      </div>

      <div
        className={[
          'gv-welcome-fade bg-card border-border/60 absolute top-12 end-3 w-52 rounded-lg border p-1.5 shadow-md',
          pinned ? 'pointer-events-none -translate-y-1 opacity-0' : 'translate-y-0 opacity-100',
        ].join(' ')}
      >
        <div className="bg-accent flex items-center gap-2 rounded-md px-2 py-1.5">
          <img src="/icon-32.png" alt="" width={16} height={16} className="rounded" />
          <span className="text-foreground flex-1 text-xs font-semibold">Voyager</span>
          <span className="text-primary relative flex h-5 w-5 items-center justify-center">
            {ACTION_ICON[browser]}
          </span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="bg-border h-4 w-4 rounded" />
          <span className="bg-border h-2 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="bg-border h-4 w-4 rounded" />
          <span className="bg-border h-2 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}
