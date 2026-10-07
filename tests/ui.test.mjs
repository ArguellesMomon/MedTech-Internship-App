import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import path from 'node:path';
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/landing',
  pretendToBeVisual: true,
});
for (const key of [
  'window',
  'document',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLTextAreaElement',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'localStorage',
])
  globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
window.scrollTo = () => {};
HTMLElement.prototype.scrollIntoView = () => {};
HTMLElement.prototype.getClientRects = function () {
  return [{ width: 100, height: 40 }];
};
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
localStorage.setItem('medtech-demo', 'true');
let server,
  React,
  act,
  createRoot,
  RootApp,
  AuthProvider,
  ThemeProvider,
  BrowserRouter,
  demoClient,
  root;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
test.before(async () => {
  server = await createServer({
    resolve: {
      alias: [
        {
          find: /^react-router-dom$/,
          replacement: path.resolve('node_modules/react-router-dom/dist/index.mjs'),
        },
        {
          find: /^react-router$/,
          replacement: path.resolve('node_modules/react-router/dist/development/index.mjs'),
        },
        {
          find: /^react-router\/dom$/,
          replacement: path.resolve('node_modules/react-router/dist/development/dom-export.mjs'),
        },
      ],
    },
    ssr: { noExternal: ['react-router-dom', 'react-router'] },
    server: { middlewareMode: true },
    appType: 'custom',
  });
  React = await import('react');
  act = React.act;
  ({ createRoot } = await import('react-dom/client'));
  ({ BrowserRouter } = await server.ssrLoadModule('/node_modules/react-router-dom/dist/index.mjs'));
  ({ default: RootApp } = await server.ssrLoadModule('/src/App.jsx'));
  ({ AuthProvider } = await server.ssrLoadModule('/src/auth/AuthProvider.jsx'));
  ({ ThemeProvider } = await server.ssrLoadModule('/src/theme/ThemeProvider.jsx'));
  ({ demoClient } = await server.ssrLoadModule('/src/lib/demo.js'));
  await Promise.all(
    [
      'pages/Dashboard',
      'pages/LandingPage',
      'pages/Login',
      'pages/Signup',
      'pages/Profile',
      'components/RotationGuide',
      'components/QuotaTracker',
      'components/ShiftPlanner',
      'components/NotesSection',
      'components/DocumentsPage',
      'components/AiChatbot',
      'components/About',
    ].map((name) => server.ssrLoadModule('/src/' + name + '.jsx')),
  );
});
test.after(async () => {
  if (root) await act(async () => root.unmount());
  await server?.close();
  dom.window.close();
});
async function mount(route = '/') {
  if (root) await act(async () => root.unmount());
  localStorage.removeItem('medtech-demo-data-v1');
  window.history.replaceState({}, '', route);
  root = createRoot(document.getElementById('root'));
  await act(async () => {
    root.render(
      React.createElement(
        BrowserRouter,
        null,
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(AuthProvider, null, React.createElement(RootApp)),
        ),
      ),
    );
    await delay(10);
  });
  for (let i = 0; i < 8; i++) await act(async () => delay(30));
}
function buttons(text) {
  return [...document.querySelectorAll('button')].filter((el) => el.textContent.includes(text));
}
async function click(el) {
  assert.ok(el, 'Expected control to exist');
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await delay(10);
  });
}
async function fill(el, value) {
  assert.ok(el, 'Expected form field to exist');
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value',
    ).set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await delay(0);
  });
}
async function escape() {
  await act(async () => {
    document.activeElement.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await delay(0);
  });
}
test('landing describes all six tools and offers a clearly labeled demo', async () => {
  await mount('/landing');
  assert.match(document.body.textContent, /Your internship,/);
  assert.equal(document.querySelectorAll('.landing-feature-card').length, 6);
  assert.ok(buttons('Explore the demo')[0]);
  assert.match(document.body.textContent, /illustrative sample data/);
});
test('overview loads current rotation, quotas, schedule, and personal notes', async () => {
  await mount('/');
  assert.match(document.body.textContent, /Alex/);
  assert.match(document.querySelector('.rotation-overview').textContent, /Hematology/);
  assert.match(document.querySelector('.overview-stat-grid').textContent, /73%/);
  assert.equal(document.querySelectorAll('.agenda-row').length, 3);
  assert.equal(document.querySelectorAll('.notebook-list>a').length, 2);
  assert.ok(document.querySelector('.demo-notice'));
});
test('quick-add dialog traps focus, closes with Escape, and restores focus', async () => {
  await mount('/');
  const opener = buttons('Quick add')[0];
  opener.focus();
  await click(opener);
  const dialog = document.querySelector('[role="dialog"]');
  assert.ok(dialog);
  assert.equal(dialog.getAttribute('aria-modal'), 'true');
  assert.ok(dialog.contains(document.activeElement));
  const controls = [...dialog.querySelectorAll('button,a[href]')];
  controls.at(-1).focus();
  await act(async () => {
    document.activeElement.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
  });
  assert.equal(document.activeElement, controls[0]);
  await escape();
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.equal(document.activeElement, opener);
});
test('quick-add note opens the real note form and saves a persistent record', async () => {
  await mount('/');
  await click(buttons('Quick add')[0]);
  await click(
    [...document.querySelectorAll('.quick-add-options>a')].find((a) =>
      a.textContent.includes('Personal note'),
    ),
  );
  for (let i = 0; i < 5; i++) await act(async () => delay(30));
  assert.equal(window.location.pathname, '/notes');
  assert.ok(document.querySelector('.nm-sheet'));
  const title = [...document.querySelectorAll('.nm-sheet input')].find((el) => el.type === 'text');
  const body = document.querySelector('.nm-sheet textarea');
  await fill(title, 'My integration test note');
  await fill(body, 'A reminder that should remain after saving.');
  await click(document.querySelector('.nm-submit'));
  for (let i = 0; i < 3; i++) await act(async () => delay(20));
  assert.equal(document.querySelector('.nm-sheet'), null);
  const { data } = await demoClient.from('notes').select().ilike('title', '%integration test%');
  assert.equal(data.length, 1);
  assert.match(document.querySelector('.ns-grid').textContent, /My integration test note/);
});
test('search renders record titles as safe text and opens the matching note', async () => {
  await mount('/');
  await demoClient.from('notes').insert({
    user_id: 'demo-intern',
    title: '<img src=x onerror=alert(1)> searchable',
    body: 'Test',
    section_name: 'Hematology',
    is_staff_tip: false,
  });
  await click(document.querySelector('.workspace-search-trigger'));
  await fill(document.querySelector('.workspace-search-field input'), 'searchable');
  await act(async () => delay(320));
  const result = document.querySelector('.workspace-search-results>button');
  assert.ok(result);
  assert.match(result.textContent, /<img/);
  assert.equal(result.querySelector('img'), null);
  await click(result);
  for (let i = 0; i < 4; i++) await act(async () => delay(30));
  assert.ok(document.querySelector('.nv-modal'));
  assert.match(document.querySelector('.nv-title').textContent, /<img/);
});
test('theme changes are applied and persist across page mounts', async () => {
  await mount('/profile');
  const dark = [...document.querySelectorAll('.theme-segment button')].find(
    (el) => el.textContent === 'dark',
  );
  await click(dark);
  assert.equal(document.documentElement.dataset.theme, 'dark');
  assert.equal(localStorage.getItem('medtech-theme'), 'dark');
  await mount('/');
  assert.equal(document.documentElement.dataset.theme, 'dark');
});
test('all existing tools mount without app errors and their quick-add forms open', async () => {
  for (const route of [
    '/rotations?new=1',
    '/reports?new=1',
    '/shifts?new=1',
    '/documents',
    '/ai-chat',
    '/about',
  ]) {
    await mount(route);
    assert.equal(document.querySelector('.error-state'), null, 'Route failed: ' + route);
    if (route.includes('new=1')) {
      assert.ok(document.querySelector('[role="dialog"]'), 'Missing form: ' + route);
      await escape();
    }
  }
});

test('quick-add report has a valid default section and saves the chosen procedure', async () => {
  await mount('/reports?new=1');
  const sheet = document.querySelector('.lm-sheet');
  assert.ok(sheet);
  const select = sheet.querySelector('select');
  await act(async () => {
    select.value = 'Complete blood count';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await fill(sheet.querySelector('input[type="number"]'), '5');
  await click(sheet.querySelector('.lm-primary'));
  for (let i = 0; i < 3; i++) await act(async () => delay(20));
  assert.equal(document.querySelector('.lm-sheet'), null);
  const { data } = await demoClient
    .from('daily_reports')
    .select()
    .eq('procedure_name', 'Complete blood count');
  const record = data.find((row) => row.count_done === 5);
  assert.ok(record);
  assert.equal(record.section_name, 'Hematology');
});
test('modal labels point to the right field and IDs remain unique', async () => {
  await mount('/reports?new=1');
  const sheet = document.querySelector('.lm-sheet');
  for (const label of sheet.querySelectorAll('label[for]')) {
    const target = document.getElementById(label.htmlFor);
    assert.ok(target);
    if (label.querySelector('input,textarea,select'))
      assert.ok(label.contains(target), 'A nested label points to a different field');
  }
  const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
  assert.equal(new Set(ids).size, ids.length);
  await escape();
});

test('document removal uses a confirmation dialog and keeps canceled records', async () => {
  await mount('/documents');
  const { data: doc } = await demoClient
    .from('documents')
    .insert({
      user_id: 'demo-intern',
      file_name: 'Test reference.pdf',
      file_url: 'https://example.test/reference.pdf',
      storage_path: 'demo-intern/test.pdf',
      file_type: 'pdf',
      file_size: 100,
    })
    .select()
    .single();
  await click(document.querySelector('.dp-refresh-btn'));
  await click(document.querySelector('.dc-delete-btn'));
  assert.ok(document.querySelector('[role="dialog"]'));
  await click(buttons('Keep file')[0]);
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.ok((await demoClient.from('documents').select().eq('id', doc.id).single()).data);
  await click(document.querySelector('.dc-delete-btn'));
  await click(buttons('Remove document')[0]);
  assert.equal(
    (await demoClient.from('documents').select().eq('id', doc.id).maybeSingle()).data,
    null,
  );
  assert.equal(document.querySelector('.dc-card'), null);
});
test('demo chat responds with an explicit sample and persists the conversation locally', async () => {
  await mount('/ai-chat');
  await fill(document.querySelector('.pip-ta'), 'Help me plan my study week');
  await click(document.querySelector('.pip-send'));
  for (let i = 0; i < 4; i++) await act(async () => delay(20));
  assert.match(document.body.textContent, /sample response in the demo/);
  assert.equal(document.querySelector('button button'), null);
  const { data } = await demoClient.from('chat_messages').select();
  assert.equal(data.length, 2);
  assert.equal(data[1].role, 'assistant');
});
