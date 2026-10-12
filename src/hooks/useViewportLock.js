import { useEffect, useLayoutEffect, useRef } from 'react';
import { containViewportGestures } from '../lib/viewport-gestures';

export default function useViewportLock({ height, top, scale, keyboardOpen }, fixed) {
  const shell = useRef(null);
  const lock = useRef({ active: false, keyboard: false, savedScroll: 0, revealTimer: 0 });

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
    node.dataset.compact = String(active && (keyboardOpen || height <= 500));
    if (active && !state.active) {
      root.classList.add('keyboard-viewport');
      if (!fixed) content.scrollTop = state.savedScroll;
      // Let the browser finish its initial caret pan. Forcing scrollTo(0, 0)
      // here fights Safari's keyboard focus scrolling and can oscillate.
    } else if (!active && state.active) {
      root.classList.remove('keyboard-viewport');
      window.scrollTo(0, restore);
    }
    state.active = active;
    state.keyboard = keyboardOpen;
  }, [height, top, scale, keyboardOpen, fixed]);

  useEffect(() => {
    const state = lock.current;
    window.clearTimeout(state.revealTimer);
    // Resize frames move the field themselves. Reveal once after they settle,
    // rather than scrolling the content again for every viewport offset event.
    if (keyboardOpen && scale === 1) state.revealTimer = window.setTimeout(revealInput, 180);
    return () => window.clearTimeout(state.revealTimer);
  }, [height, keyboardOpen, scale]);

  useEffect(() => {
    const state = lock.current;
    const release = containViewportGestures(
      () => state.active,
      () => state.keyboard,
    );
    const focus = () => {
      window.clearTimeout(state.revealTimer);
      state.revealTimer = window.setTimeout(revealInput, 180);
    };
    document.addEventListener('focusin', focus);
    return () => {
      release();
      state.active = false;
      state.keyboard = false;
      document.removeEventListener('focusin', focus);
      window.clearTimeout(state.revealTimer);
      document.documentElement.classList.remove('keyboard-viewport');
      document.documentElement.style.removeProperty('--locked-viewport-height');
      document.documentElement.style.removeProperty('--locked-viewport-top');
    };
  }, []);
  return shell;
}
