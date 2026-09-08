import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPromptRowSurfaces } from '../promptRowMenu';

let surfaces: ReturnType<typeof createPromptRowSurfaces> | null = null;

function mount() {
  surfaces = createPromptRowSurfaces();
  const anchor = document.createElement('button');
  anchor.textContent = 'Delete';
  document.body.appendChild(anchor);
  return { surfaces, anchor };
}

const menuItems = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('.gv-pm-row-menu-item'));

afterEach(() => {
  surfaces?.destroy();
  surfaces = null;
  document.body.innerHTML = '';
});

describe('prompt row menu', () => {
  it('runs the chosen action once and closes', () => {
    const { surfaces } = mount();
    const onSelect = vi.fn();
    surfaces.openMenu({ x: 20, y: 20 }, [{ label: '编辑', onSelect }]);

    expect(menuItems()).toHaveLength(1);
    menuItems()[0].click();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(surfaces.isOpen()).toBe(false);
    expect(menuItems()).toHaveLength(0);
  });

  it('keeps a disabled entry inert', () => {
    const { surfaces } = mount();
    const onSelect = vi.fn();
    surfaces.openMenu({ x: 0, y: 0 }, [{ label: '上移', disabled: true, onSelect }]);

    menuItems()[0].click();

    expect(onSelect).not.toHaveBeenCalled();
    expect(surfaces.isOpen()).toBe(true);
  });

  it('closes on Escape, on an outside press, and on a scroll underneath', () => {
    const { surfaces } = mount();
    const open = () => surfaces.openMenu({ x: 0, y: 0 }, [{ label: '编辑', onSelect: () => {} }]);

    open();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(surfaces.isOpen()).toBe(false);

    open();
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(surfaces.isOpen()).toBe(false);

    open();
    window.dispatchEvent(new Event('scroll'));
    expect(surfaces.isOpen()).toBe(false);
  });

  it('keeps a press inside the menu from dismissing it', () => {
    const { surfaces } = mount();
    surfaces.openMenu({ x: 0, y: 0 }, [{ label: '编辑', onSelect: () => {} }]);

    menuItems()[0].dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));

    expect(surfaces.isOpen()).toBe(true);
  });

  it('replaces a surface that is already open instead of stacking', () => {
    const { surfaces, anchor } = mount();
    surfaces.openConfirm({
      anchor,
      message: '删除这条提示词？',
      confirmLabel: '删除',
      cancelLabel: '取消',
      onConfirm: () => {},
    });
    surfaces.openMenu({ x: 0, y: 0 }, [{ label: '编辑', onSelect: () => {} }]);

    expect(document.querySelectorAll('.gv-pm-confirm')).toHaveLength(0);
    expect(document.querySelectorAll('.gv-pm-row-menu')).toHaveLength(1);
  });

  it('confirms only on the confirm button and returns focus to the anchor', () => {
    const { surfaces, anchor } = mount();
    const onConfirm = vi.fn();
    const request = {
      anchor,
      message: '删除这条提示词？',
      confirmLabel: '删除',
      cancelLabel: '取消',
      onConfirm,
    };

    surfaces.openConfirm(request);
    document.querySelector<HTMLButtonElement>('.gv-pm-confirm button:last-child')!.click();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(anchor);

    surfaces.openConfirm(request);
    document.querySelector<HTMLButtonElement>('.gv-pm-confirm-yes')!.click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(surfaces.isOpen()).toBe(false);
  });
});
