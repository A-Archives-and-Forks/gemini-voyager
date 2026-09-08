/* Floating surfaces owned by a prompt row: the action menu and the delete
 * confirmation.
 *
 * Both are single-instance and dismissed the same way — an outside press,
 * Escape, or a scroll underneath — so they share one open slot and one
 * teardown. Keeping them together is what stops a right-click from stacking a
 * menu on top of a confirmation that is still waiting for an answer.
 */

export type RowMenuIcon = 'edit' | 'delete' | 'up' | 'down';

export type RowMenuItem = {
  label: string;
  icon?: RowMenuIcon;
  /** Renders the item in the destructive colour. */
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

export type ConfirmRequest = {
  /** The control the popover points at; also where focus returns. */
  anchor: HTMLElement;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
};

export type PromptRowSurfaces = {
  openMenu: (point: { x: number; y: number }, items: RowMenuItem[]) => void;
  openConfirm: (request: ConfirmRequest) => void;
  isOpen: () => boolean;
  close: () => void;
  destroy: () => void;
};

const VIEWPORT_PAD = 8;
/** Matches the confirmation's own width budget when deciding which side to open on. */
const CONFIRM_WIDTH_ESTIMATE = 220;

export function createPromptRowSurfaces(): PromptRowSurfaces {
  let open: { el: HTMLElement; restoreFocus: HTMLElement | null; release: () => void } | null =
    null;

  function close(): void {
    if (!open) return;
    const current = open;
    open = null;
    current.release();
    current.el.remove();
    // Only pull focus back if the surface still owns it; a click elsewhere has
    // already moved it somewhere the user chose.
    if (current.restoreFocus?.isConnected && !document.activeElement?.closest('input, textarea')) {
      current.restoreFocus.focus({ preventScroll: true });
    }
  }

  function mount(el: HTMLElement, restoreFocus: HTMLElement | null): void {
    close();
    document.body.appendChild(el);

    const onOutside = (ev: Event) => {
      const target = ev.target as HTMLElement | null;
      if (target?.closest('.gv-pm-confirm, .gv-pm-row-menu')) return;
      close();
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      // Capture phase: dismissing a surface must not also close the panel.
      ev.preventDefault();
      ev.stopPropagation();
      close();
    };
    const onScroll = () => close();

    window.addEventListener('pointerdown', onOutside, true);
    window.addEventListener('click', onOutside, true);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);

    open = {
      el,
      restoreFocus,
      release: () => {
        window.removeEventListener('pointerdown', onOutside, true);
        window.removeEventListener('click', onOutside, true);
        window.removeEventListener('keydown', onKey, true);
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onScroll);
      },
    };
  }

  function openMenu(point: { x: number; y: number }, items: RowMenuItem[]): void {
    const previous = document.activeElement as HTMLElement | null;
    const menu = document.createElement('div');
    menu.className = 'gv-pm-row-menu';
    menu.setAttribute('role', 'menu');
    // Focus lands on the container, not the first entry: a mouse-opened menu
    // should not come up wearing a focus ring. Arrow keys move into the items.
    menu.tabIndex = -1;

    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gv-pm-row-menu-item';
      button.setAttribute('role', 'menuitem');
      if (item.icon) button.dataset.gvIcon = item.icon;
      if (item.danger) button.classList.add('gv-pm-row-menu-danger');
      button.disabled = !!item.disabled;
      button.textContent = item.label;
      button.addEventListener('click', (ev) => {
        ev.stopPropagation();
        close();
        item.onSelect();
      });
      menu.appendChild(button);
    }

    menu.addEventListener('keydown', (ev) => {
      const step = ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowUp' ? -1 : 0;
      if (!step) return;
      ev.preventDefault();
      const options = Array.from(
        menu.querySelectorAll<HTMLButtonElement>('.gv-pm-row-menu-item:not([disabled])'),
      );
      if (options.length === 0) return;
      const index = options.indexOf(document.activeElement as HTMLButtonElement);
      // From the container itself, ArrowDown enters at the top and ArrowUp at
      // the bottom.
      const next =
        index < 0
          ? step > 0
            ? 0
            : options.length - 1
          : (index + step + options.length) % options.length;
      options[next]?.focus();
    });

    mount(menu, previous);

    const rect = menu.getBoundingClientRect();
    const left = Math.min(point.x, window.innerWidth - rect.width - VIEWPORT_PAD);
    const top = Math.min(point.y, window.innerHeight - rect.height - VIEWPORT_PAD);
    menu.style.left = `${Math.round(Math.max(VIEWPORT_PAD, left))}px`;
    menu.style.top = `${Math.round(Math.max(VIEWPORT_PAD, top))}px`;

    menu.focus({ preventScroll: true });
  }

  function openConfirm(request: ConfirmRequest): void {
    const pop = document.createElement('div');
    pop.className = 'gv-pm-confirm';

    const message = document.createElement('span');
    message.textContent = request.message;
    const confirm = document.createElement('button');
    confirm.className = 'gv-pm-confirm-yes';
    confirm.textContent = request.confirmLabel;
    const cancel = document.createElement('button');
    cancel.textContent = request.cancelLabel;
    pop.append(message, confirm, cancel);

    cancel.addEventListener('click', (ev) => {
      ev.stopPropagation();
      close();
    });
    confirm.addEventListener('click', (ev) => {
      ev.stopPropagation();
      close();
      request.onConfirm();
    });

    mount(pop, request.anchor);

    const anchorRect = request.anchor.getBoundingClientRect();
    const side: 'left' | 'right' =
      anchorRect.right + CONFIRM_WIDTH_ESTIMATE > window.innerWidth ? 'left' : 'right';
    const top = Math.max(VIEWPORT_PAD, anchorRect.top + window.scrollY - 6);
    const left =
      side === 'right'
        ? anchorRect.right + window.scrollX + 10
        : anchorRect.left + window.scrollX - pop.offsetWidth - 10;
    pop.style.top = `${Math.round(top)}px`;
    pop.style.left = `${Math.round(Math.max(VIEWPORT_PAD, left))}px`;
    pop.setAttribute('data-side', side);

    confirm.focus({ preventScroll: true });
  }

  return {
    openMenu,
    openConfirm,
    isOpen: () => open !== null,
    close,
    destroy: close,
  };
}
