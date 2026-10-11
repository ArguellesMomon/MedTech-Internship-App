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
    let keyboardOpen = false;
    const update = () => {
      const next = readViewport();
      const focused = document.activeElement?.matches('input, textarea, [contenteditable="true"]');
      if (window.innerWidth !== restingWidth) {
        restingWidth = window.innerWidth;
        restingHeight = window.innerHeight;
        keyboardOpen = false;
      }
      // Some browsers resize both viewports. Retain the pre-keyboard height while typing.
      const referenceHeight =
        focused || keyboardOpen ? Math.max(restingHeight, window.innerHeight) : window.innerHeight;
      const obscured = referenceHeight - next.height * next.scale;
      keyboardOpen = obscured > Math.max(120, referenceHeight * 0.15);
      if (!keyboardOpen) restingHeight = window.innerHeight;
      setState((previous) =>
        previous.height === next.height &&
        previous.top === next.top &&
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
