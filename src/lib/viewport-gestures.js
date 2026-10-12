// Safari can pan its native viewport despite overflow:hidden. Keep a drag in
// an actual scroll container instead of handing it to the document/keyboard.
export function containViewportGestures(isLocked, isKeyboardOpen) {
  let touch;
  function scrollContainer(target, delta, horizontal) {
    for (
      let el = target?.nodeType === 1 ? target : target?.parentElement;
      el && el !== document.body;
      el = el.parentElement
    ) {
      const style = window.getComputedStyle(el);
      const overflow = horizontal ? style.overflowX : style.overflowY;
      const position = horizontal ? el.scrollLeft : el.scrollTop;
      const limit = horizontal
        ? el.scrollWidth - el.clientWidth
        : el.scrollHeight - el.clientHeight;
      if (
        /(auto|scroll)/.test(overflow) &&
        limit > 1 &&
        (delta < 0 ? position > 0 : position < limit - 1)
      )
        return el;
    }
    return null;
  }
  const start = (event) => {
    touch =
      event.touches.length === 1
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
        : null;
  };
  const move = (event) => {
    if (!isLocked() || event.touches.length !== 1 || window.visualViewport?.scale > 1) {
      touch = null;
      return;
    }
    const current = event.touches[0];
    if (!touch) {
      start(event);
      return;
    }
    const dx = touch.x - current.clientX,
      dy = touch.y - current.clientY;
    touch = { x: current.clientX, y: current.clientY };
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const delta = horizontal ? dx : dy;
    const scroller = scrollContainer(event.target, delta, horizontal);
    // With the keyboard up, consume the drag ourselves. Native inner scrolling
    // can still move Safari's root viewport, even before its boundary is reached.
    if ((!scroller || isKeyboardOpen()) && event.cancelable) {
      event.preventDefault();
      if (scroller) {
        if (horizontal) scroller.scrollLeft += delta;
        else scroller.scrollTop += delta;
      }
    }
  };
  const end = () => {
    touch = null;
  };
  const wheel = (event) => {
    if (!isLocked() || event.ctrlKey) return;
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    if (!scrollContainer(event.target, horizontal ? event.deltaX : event.deltaY, horizontal))
      event.preventDefault();
  };
  document.addEventListener('touchstart', start, { passive: true });
  document.addEventListener('touchmove', move, { passive: false });
  document.addEventListener('touchend', end, { passive: true });
  document.addEventListener('touchcancel', end, { passive: true });
  document.addEventListener('wheel', wheel, { passive: false });
  return () => {
    document.removeEventListener('touchstart', start);
    document.removeEventListener('touchmove', move);
    document.removeEventListener('touchend', end);
    document.removeEventListener('touchcancel', end);
    document.removeEventListener('wheel', wheel);
  };
}
