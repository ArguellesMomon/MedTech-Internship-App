import assert from 'node:assert/strict';
import { it } from 'node:test';
import { containViewportGestures } from '../src/lib/viewport-gestures.js';

// A controlled clock lets the same fling run at both 60 Hz and 120 Hz.
function scene() {
  const saved = new Map(['window', 'document', 'performance'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let time = 0, id = 0, locked = true, keyboard = true;
  const frames = new Map();
  class Surface {
    listeners = new Map();
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(fn);
    }
    removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
    fire(type, event = {}) {
      event.type = type;
      event.cancelable ??= true;
      event.defaultPrevented = false;
      event.preventDefault = () => { if (event.cancelable) event.defaultPrevented = true; };
      for (const fn of this.listeners.get(type) || []) fn(event);
      return event;
    }
  }
  const media = Object.assign(new Surface(), { matches: false });
  const viewport = Object.assign(new Surface(), { scale: 1 });
  const document = Object.assign(new Surface(), { hidden: false, body: {}, documentElement: { dataset: {} } });
  const window = Object.assign(new Surface(), {
    visualViewport: viewport, matchMedia: () => media,
    getComputedStyle: el => el.style,
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: key => frames.delete(key),
  });
  for (const [key, value] of Object.entries({ window, document, performance: { now: () => time } })) {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  const container = (parent = document.body) => ({
    nodeType: 1, parentElement: parent, isConnected: true,
    style: { overflowY: 'auto', overflowX: 'auto' },
    scrollTop: 500, scrollLeft: 500, scrollHeight: 5000, clientHeight: 300,
    scrollWidth: 5000, clientWidth: 300, writes: 0,
    scrollTo(options) {
      assert.equal(options.behavior, 'instant');
      this.writes++;
      if (options.top !== undefined) this.scrollTop = Math.max(0, Math.min(this.scrollHeight - this.clientHeight, options.top));
      if (options.left !== undefined) this.scrollLeft = Math.max(0, Math.min(this.scrollWidth - this.clientWidth, options.left));
    },
  });
  const scroller = container();
  const child = { nodeType: 1, parentElement: scroller, style: {} };
  const release = containViewportGestures(() => locked, () => keyboard);
  const fire = (type, x = 100, y = 300, target = child, count = 1) => document.fire(type, {
    target, touches: Array.from({ length: count }, (_, identifier) => ({ identifier, clientX: x, clientY: y })),
  });
  const tick = (ms = 16, frameLag = 0) => {
    time += ms;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(fn => fn(time - frameLag));
  };
  const fling = (target = child, horizontal = false) => {
    fire('touchstart', 100, 300, target);
    for (let i = 1; i <= 4; i++) {
      time += 16;
      const event = fire('touchmove', horizontal ? 100 - i * 20 : 100, horizontal ? 300 : 300 - i * 20, target);
      assert.equal(event.defaultPrevented, true);
      tick(0);
    }
    fire('touchend', 20, 220, target, 0);
  };
  return {
    document, window, viewport, media, scroller, child, container, frames, fire, tick, fling,
    setKeyboard: value => { keyboard = value; }, setLocked: value => { locked = value; },
    wait: ms => { time += ms; },
    cleanup() {
      release();
      assert.equal(frames.size, 0, 'cleanup cancels animation');
      for (const [key, descriptor] of saved) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    },
  };
}

function check(name, run) {
  it(name, () => { const s = scene(); try { run(s); } finally { s.cleanup(); } });
}

check('keyboard scrolling follows the finger once per frame and coasts after release', s => {
  s.fire('touchstart');
  s.wait(16); s.fire('touchmove', 100, 280);
  s.wait(4); s.fire('touchmove', 101, 270);
  assert.equal(s.scroller.writes, 0);
  s.tick(0);
  assert.equal(s.scroller.scrollTop, 530);
  assert.equal(s.scroller.scrollLeft, 500, 'axis remains vertical');
  assert.equal(s.scroller.writes, 1);
  s.fire('touchend', 100, 270, s.child, 0);
  s.tick(); const first = s.scroller.scrollTop;
  s.tick(); const second = s.scroller.scrollTop;
  assert.ok(first > 530 && second > first);
  assert.ok(second - first < first - 530, 'momentum decelerates');
  for (let i = 0; i < 100; i++) s.tick();
  assert.equal(s.frames.size, 0, 'momentum settles');
});

check('horizontal flings also remain inside their scroll container', s => {
  s.fling(s.child, true); s.tick();
  assert.ok(s.scroller.scrollLeft > 580);
  assert.equal(s.scroller.scrollTop, 500);
});

check('a frame timestamp just before release does not discard the fling', s => {
  s.fling();
  const released = s.scroller.scrollTop;
  s.tick(0, 4);
  assert.equal(s.scroller.scrollTop, released);
  s.tick();
  assert.ok(s.scroller.scrollTop > released);
});

check('container edges clamp momentum without transferring it to a parent', s => {
  const inner = s.container(s.scroller);
  inner.scrollHeight = 400; inner.scrollTop = 90;
  s.fling(inner); for (let i = 0; i < 10; i++) s.tick();
  assert.equal(inner.scrollTop, 100);
  assert.equal(s.scroller.scrollTop, 500);
  inner.scrollTop = 0;
  s.fire('touchstart', 100, 100, inner);
  s.wait(16); s.fire('touchmove', 100, 160, inner);
  s.fire('touchend', 100, 160, inner, 0); s.tick();
  assert.equal(inner.scrollTop, 0);
  assert.equal(s.scroller.scrollTop, 500);
});

for (const interruption of ['touch', 'cancel', 'focus', 'typing', 'wheel', 'resize', 'viewport-pan', 'hidden', 'blur', 'preference']) {
  check(`${interruption} stops a fling immediately`, s => {
    s.fling(); s.tick();
    const position = s.scroller.scrollTop;
    if (interruption === 'touch') s.fire('touchstart');
    if (interruption === 'cancel') s.fire('touchcancel', 0, 0, s.child, 0);
    if (interruption === 'focus') s.document.fire('focusin');
    if (interruption === 'typing') s.document.fire('input');
    if (interruption === 'wheel') s.document.fire('wheel', { target: s.child, deltaY: 10, deltaX: 0 });
    if (interruption === 'resize') s.viewport.fire('resize');
    if (interruption === 'viewport-pan') s.viewport.fire('scroll');
    if (interruption === 'hidden') { s.document.hidden = true; s.document.fire('visibilitychange'); }
    if (interruption === 'blur') s.window.fire('blur');
    if (interruption === 'preference') { s.media.matches = true; s.media.fire('change'); }
    s.tick(); s.tick();
    assert.equal(s.scroller.scrollTop, position);
  });
}

check('keyboard dismissal, unlocking, pinch zoom, removal and long stalls stop momentum', s => {
  for (const reason of ['keyboard', 'lock', 'zoom', 'removed', 'stall']) {
    s.setKeyboard(true); s.setLocked(true); s.viewport.scale = 1; s.scroller.isConnected = true;
    s.fling(); s.tick(); const position = s.scroller.scrollTop;
    if (reason === 'keyboard') s.setKeyboard(false);
    if (reason === 'lock') s.setLocked(false);
    if (reason === 'zoom') s.viewport.scale = 2;
    if (reason === 'removed') s.scroller.isConnected = false;
    s.tick(reason === 'stall' ? 200 : 16);
    assert.equal(s.scroller.scrollTop, position, reason);
    assert.equal(s.frames.size, 0, reason);
  }
});

check('holding before release and reduced-motion preferences skip momentum', s => {
  s.fire('touchstart'); s.wait(16); s.fire('touchmove', 100, 220); s.tick();
  s.wait(150); s.fire('touchend', 100, 220, s.child, 0); s.tick();
  assert.equal(s.scroller.scrollTop, 580);
  for (const preference of ['system', 'app']) {
    if (preference === 'system') s.media.matches = true;
    else { s.media.matches = false; s.document.documentElement.dataset.reducedMotion = 'true'; }
    const before = s.scroller.scrollTop;
    s.fling(); s.tick();
    assert.equal(s.scroller.scrollTop, before + 80);
    assert.equal(s.frames.size, 0);
  }
});

check('normal native scrolling and two-finger zoom are left available', s => {
  s.setKeyboard(false); s.fire('touchstart');
  assert.equal(s.fire('touchmove', 100, 220).defaultPrevented, false);
  s.fire('touchend', 100, 220, s.child, 0); s.tick();
  assert.equal(s.scroller.writes, 0);
  s.setKeyboard(true); s.fire('touchstart', 100, 300, s.child, 2);
  assert.equal(s.fire('touchmove', 100, 200, s.child, 2).defaultPrevented, false);
  assert.equal(s.frames.size, 0);
});

check('navigation drags are contained without creating momentum', s => {
  const navigation = { nodeType: 1, parentElement: s.document.body, style: {} };
  s.fling(navigation); s.tick();
  assert.equal(s.scroller.writes, 0);
  assert.equal(s.frames.size, 0);
});

it('fling distance is independent of display refresh rate', () => {
  const distance = hz => {
    const s = scene();
    try {
      s.fling();
      for (let i = 0; i < hz / 2; i++) s.tick(1000 / hz);
      return s.scroller.scrollTop;
    } finally { s.cleanup(); }
  };
  assert.ok(Math.abs(distance(60) - distance(120)) < 0.01);
});
