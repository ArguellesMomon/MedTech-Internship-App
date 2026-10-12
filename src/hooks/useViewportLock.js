import { useEffect, useLayoutEffect, useRef } from 'react';
import { containViewportGestures } from '../lib/viewport-gestures';

export default function useViewportLock({ height, top, scale, keyboardOpen }, fixed) {
  const shell = useRef(null);
  const lock = useRef({ active: false, keyboard: false, savedScroll: 0, revealFrame: 0 });

  function revealInput() {
    if (!lock.current.keyboard) return;
    const input = document.activeElement;
    if (!input?.matches('input, textarea, [contenteditable="true"]')) return;
    for (
      let node = input.parentElement;
      node && node !== document.body;
      node = node.parentElement
    ) {
      if (!/(auto|scroll)/.test(window.getComputedStyle(node).overflowY)) continue;
      const field = input.getBoundingClientRect(),
        area = node.getBoundingClientRect();
      if (field.height > area.height - 24) node.scrollTop += field.top - area.top - 12;
      else if (field.bottom > area.bottom - 12) node.scrollTop += field.bottom - area.bottom + 12;
      else if (field.top < area.top + 12) node.scrollTop += field.top - area.top - 12;
      break;
    }
  }

  useLayoutEffect(() => {
    const node = shell.current;
    if (!node || scale !== 1) return;
    const state = lock.current,
      root = document.documentElement;
    const active = fixed || keyboardOpen;
    const content = node.querySelector('.workspace-main') || node;
    const restore = content.scrollTop;
    if (active && !state.active) state.savedScroll = window.scrollY;
    root.style.setProperty('--locked-viewport-height', height + 'px');
    root.style.setProperty('--locked-viewport-top', top + 'px');
    node.dataset.viewportLocked = String(active);
    node.dataset.compact = String(active && height <= 500);
    if (active && !state.active) {
      root.classList.add('keyboard-viewport');
      if (!fixed) content.scrollTop = state.savedScroll;
      window.scrollTo(0, 0);
    } else if (!active && state.active) {
      root.classList.remove('keyboard-viewport');
      window.scrollTo(0, restore);
    }
    state.active = active;
    state.keyboard = keyboardOpen;
    window.cancelAnimationFrame(state.revealFrame);
    state.revealFrame = window.requestAnimationFrame(revealInput);
  }, [height, top, scale, keyboardOpen, fixed]);

  useEffect(() => {
    const state = lock.current;
    const release = containViewportGestures(
      () => state.active,
      () => state.keyboard,
    );
    const focus = () => {
      window.cancelAnimationFrame(state.revealFrame);
      state.revealFrame = window.requestAnimationFrame(revealInput);
    };
    const reset = () => {
      if (
        state.active &&
        (!window.visualViewport || window.visualViewport.scale === 1) &&
        window.scrollY
      )
        window.scrollTo(0, 0);
    };
    document.addEventListener('focusin', focus);
    window.addEventListener('scroll', reset);
    return () => {
      release();
      state.active = false;
      state.keyboard = false;
      document.removeEventListener('focusin', focus);
      window.removeEventListener('scroll', reset);
      window.cancelAnimationFrame(state.revealFrame);
      document.documentElement.classList.remove('keyboard-viewport');
      document.documentElement.style.removeProperty('--locked-viewport-height');
      document.documentElement.style.removeProperty('--locked-viewport-top');
    };
  }, []);
  return shell;
}
