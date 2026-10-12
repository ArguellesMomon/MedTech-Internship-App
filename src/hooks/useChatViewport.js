import { useEffect, useState } from 'react';

function readViewport() {
  const viewport = window.visualViewport;
  return {
    height: Math.round(viewport?.height || window.innerHeight),
    top: Math.max(0, Math.round(viewport?.offsetTop || 0)),
    scale: viewport?.scale || 1,
  };
}

export default function useChatViewport() {
  const [state, setState] = useState(() => ({ ...readViewport(), keyboardOpen: false }));
  useEffect(() => {
    const viewport = window.visualViewport;
    let restingHeight = window.innerHeight;
    let restingWidth = window.innerWidth;
    // Browser toolbars can obscure some of the layout viewport without a keyboard.
    const normalInset = () =>
      Math.min(100, Math.max(0, window.innerHeight - readViewport().height * readViewport().scale));
    let restingInset = normalInset();
    let keyboardOpen = false;
    const update = () => {
      const next = readViewport();
      const focused = document.activeElement?.matches('input, textarea, [contenteditable="true"]');
      if (window.innerWidth !== restingWidth) {
        restingHeight = keyboardOpen
          ? Math.max(window.innerHeight, restingWidth)
          : window.innerHeight;
        restingWidth = window.innerWidth;
        restingInset = 0;
      }
      // Some browsers resize both viewports. Retain the pre-keyboard height while typing.
      const referenceHeight =
        focused || keyboardOpen ? Math.max(restingHeight, window.innerHeight) : window.innerHeight;
      const obscured = referenceHeight - next.height * next.scale - restingInset;
      // Keep the opening baseline through intermediate animation frames, and
      // use separate open/close thresholds so small viewport oscillations do not
      // repeatedly switch between the document and the keyboard layout.
      const threshold = keyboardOpen ? 60 : Math.max(120, referenceHeight * 0.15);
      keyboardOpen = next.scale === 1 && obscured > threshold;
      if (!keyboardOpen) {
        if (!focused) {
          restingHeight = window.innerHeight;
          restingInset = normalInset();
        }
        if (next.scale === 1) next.top = 0;
      }
      setState((previous) =>
        previous.height === next.height &&
        previous.top === next.top &&
        previous.scale === next.scale &&
        previous.keyboardOpen === keyboardOpen
          ? previous
          : { ...next, keyboardOpen },
      );
    };
    update();
    window.addEventListener('resize', update);
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      window.removeEventListener('resize', update);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);
  return state;
}
