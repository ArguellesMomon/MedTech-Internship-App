import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
const focusables =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';
export default function Dialog({
  children,
  className = 'dialog-overlay',
  onClose,
  label = 'Dialog',
}) {
  const ref = useRef(null);
  const [viewport, setViewport] = useState(() => ({
    height: window.visualViewport?.height || window.innerHeight,
    top: window.visualViewport?.offsetTop || 0,
  }));
  useEffect(() => {
    const vv = window.visualViewport;
    const update = () =>
      setViewport({ height: vv?.height || window.innerHeight, top: vv?.offsetTop || 0 });
    const target = vv || window;
    target.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    return () => {
      target.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
    };
  }, []);
  const id = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const node = ref.current;
    const heading = node.querySelector('h1,h2,h3,[class$="-title"]');
    if (heading) {
      heading.id ||= id;
      node.setAttribute('aria-labelledby', heading.id);
    }
    const visible = () =>
      [...node.querySelectorAll(focusables)].filter((el) => el.getClientRects().length);
    (visible()[0] || node).focus();
    function keydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close.current?.();
      }
      if (event.key !== 'Tab') return;
      const items = visible();
      const first = items[0],
        last = items.at(-1);
      if (!first) {
        event.preventDefault();
        node.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === node)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    node.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = oldOverflow;
      node.removeEventListener('keydown', keydown);
      if (previous?.isConnected) previous.focus();
    };
  }, [id]);
  return createPortal(
    <div
      ref={ref}
      data-app-dialog="true"
      style={{ '--dialog-height': viewport.height + 'px', '--dialog-top': viewport.top + 'px' }}
      className={className}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
