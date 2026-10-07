import { useEffect, useId, useRef } from 'react';
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
