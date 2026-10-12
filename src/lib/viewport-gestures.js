// Safari can pan its native viewport despite overflow:hidden. Keep keyboard
// drags and their momentum inside one scroll container, away from the document.
export function containViewportGestures(isLocked, isKeyboardOpen) {
  let touch = null, motion = null, frame = null;
  const viewport = window.visualViewport;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const keyboardScrolling = () => isLocked() && isKeyboardOpen() && (!viewport || viewport.scale === 1);
  const reduceMotion = () => reducedMotion.matches || document.documentElement.dataset.reducedMotion === 'true';

  function scrollContainer(target, delta, horizontal, includeBoundary = false) {
    for (let el = target?.nodeType === 1 ? target : target?.parentElement; el && el !== document.body; el = el.parentElement) {
      const style = window.getComputedStyle(el);
      const overflow = horizontal ? style.overflowX : style.overflowY;
      const position = horizontal ? el.scrollLeft : el.scrollTop;
      const limit = horizontal ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
      if (/(auto|scroll)/.test(overflow) && limit > 1 && (includeBoundary || (delta < 0 ? position > 0 : position < limit - 1))) return el;
    }
    return null;
  }
  function scrollBy(el, horizontal, delta) {
    if (!el?.isConnected) return 0;
    const position = horizontal ? el.scrollLeft : el.scrollTop;
    const limit = Math.max(0, horizontal ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight);
    const next = Math.max(0, Math.min(limit, position + delta));
    // CSS scroll-behavior:smooth would restart an animation on every frame.
    el.scrollTo(horizontal ? { left: next, behavior: 'instant' } : { top: next, behavior: 'instant' });
    return (horizontal ? el.scrollLeft : el.scrollTop) - position;
  }

  function stop() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    touch = null;
    motion = null;
  }

  function flushDrag(gesture) {
    if (keyboardScrolling() && gesture.scroller && gesture.pending) {
      scrollBy(gesture.scroller, gesture.horizontal, gesture.pending);
    }
    gesture.pending = 0;
  }

  function animate(time) {
    frame = null;
    if (!keyboardScrolling() || document.hidden) { stop(); return; }
    if (touch) { flushDrag(touch); return; }
    if (!motion || reduceMotion()) { stop(); return; }
    // A callback's frame timestamp can precede a touchend in the same frame.
    const elapsed = Math.max(0, time - motion.time);
    // A suspended tab or busy main thread should not cause a large jump.
    if (elapsed > 80) { stop(); return; }
    const decay = Math.exp(-elapsed / 240);
    const delta = motion.velocity * 240 * (1 - decay);
    const moved = scrollBy(motion.scroller, motion.horizontal, delta);
    motion.velocity *= decay;
    motion.time = Math.max(time, motion.time);
    if (Math.abs(motion.velocity) < 0.02 || Math.abs(moved - delta) > 1 || !motion.scroller.isConnected) { stop(); return; }
    frame = window.requestAnimationFrame(animate);
  }

  const start = event => {
    stop();
    if (!isLocked() || event.touches.length !== 1 || viewport?.scale > 1) return;
    const point = event.touches[0];
    touch = {
      x: point.clientX, y: point.clientY, target: event.target,
      horizontal: null, scroller: null, pending: 0, distance: 0,
      samples: [{ time: performance.now(), position: 0 }],
    };
  };

  const move = event => {
    if (!isLocked() || event.touches.length !== 1 || viewport?.scale > 1) { stop(); return; }
    if (!touch) { start(event); return; }
    const current = event.touches[0];
    const dx = touch.x - current.clientX, dy = touch.y - current.clientY;
    if (!isKeyboardOpen()) {
      touch.x = current.clientX;
      touch.y = current.clientY;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      if (!scrollContainer(event.target, horizontal ? dx : dy, horizontal) && event.cancelable) event.preventDefault();
      return;
    }
    if (!event.cancelable || !keyboardScrolling()) { stop(); return; }
    event.preventDefault();
    if (touch.horizontal === null) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 4) return;
      touch.horizontal = Math.abs(dx) > Math.abs(dy);
      // Never pass a textarea/dialog's edge drag on to its parent or the page.
      touch.scroller = scrollContainer(touch.target, touch.horizontal ? dx : dy, touch.horizontal, true);
    }
    const delta = touch.horizontal ? dx : dy;
    touch.x = current.clientX;
    touch.y = current.clientY;
    if (!touch.scroller) return;
    const time = performance.now();
    const samples = touch.samples;
    const last = samples[samples.length - 1];
    const previous = samples[samples.length - 2];
    if (previous && delta * (last.position - previous.position) < 0) touch.samples = [last];
    touch.distance += delta;
    touch.samples.push({ time, position: touch.distance });
    while (touch.samples.length > 2 && touch.samples[1].time < time - 100) touch.samples.shift();
    touch.pending += delta;
    // Coalesce touch events into one scroll write per display frame.
    if (frame === null) frame = window.requestAnimationFrame(animate);
  };

  const end = event => {
    const gesture = touch;
    if (!gesture) return;
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    flushDrag(gesture);
    touch = null;
    if (event.touches.length || !keyboardScrolling() || !gesture.scroller || reduceMotion()) return;
    const samples = gesture.samples;
    const first = samples[0], last = samples[samples.length - 1];
    const time = performance.now();
    // Holding still before release is a stop, not a fling.
    if (time - last.time > 80 || Math.abs(last.position - first.position) < 4) return;
    const velocity = Math.max(-3, Math.min(3, (last.position - first.position) / Math.max(1, last.time - first.time)));
    if (Math.abs(velocity) < 0.05) return;
    motion = { scroller: gesture.scroller, horizontal: gesture.horizontal, velocity, time };
    frame = window.requestAnimationFrame(animate);
  };
  const wheel = event => {
    stop();
    if (!isLocked() || event.ctrlKey) return;
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    if (!scrollContainer(event.target, horizontal ? event.deltaX : event.deltaY, horizontal)) event.preventDefault();
  };
  const listeners = [
    [document, 'touchstart', start, true],
    [document, 'touchmove', move, false],
    [document, 'touchend', end, true],
    [document, 'touchcancel', stop, true],
    [document, 'wheel', wheel, false],
    [document, 'focusin', stop, true],
    [document, 'focusout', stop, true],
    [document, 'keydown', stop, true],
    [document, 'input', stop, true],
    [document, 'visibilitychange', stop, true],
    [window, 'resize', stop, true],
    [window, 'blur', stop, true],
    [viewport, 'resize', stop, true],
    [viewport, 'scroll', stop, true],
    [reducedMotion, 'change', stop, true],
  ];
  for (const [target, type, listener, passive] of listeners) target?.addEventListener(type, listener, { passive });
  return () => {
    stop();
    for (const [target, type, listener] of listeners) target?.removeEventListener(type, listener);
  };
}
