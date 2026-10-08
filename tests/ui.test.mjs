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
let server,
  React,
  act,
  createRoot,
  RootApp,
  AuthProvider,
  ThemeProvider,
  BrowserRouter,
  fixtureClient,
  root;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const originalFetch = globalThis.fetch;
test.before(async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/chat');
    assert.equal(options.headers.Authorization, 'Bearer fixture-access-token');
    return {
      ok: true,
      json: async () => ({ content: 'Choose one topic at a time and leave room for breaks.' }),
    };
  };
  server = await createServer({
    resolve: {
      alias: [
        {
          find: /^(?:.*\/)?lib\/supabase(?:\.js)?$/,
          replacement: path.resolve('tests/fixtures/supabase.js'),
        },
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
  ({ fixtureClient } = await server.ssrLoadModule('/tests/fixtures/workspace.js'));
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
  globalThis.fetch = originalFetch;
});
async function mount(route = '/') {
  if (root) await act(async () => root.unmount());
  localStorage.removeItem('test-workspace-data');
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
test('landing describes all six tools and directs visitors to account signup', async () => {
  await mount('/landing');
  assert.match(document.body.textContent, /Your internship,/);
  assert.equal(document.querySelectorAll('.landing-feature-card').length, 6);
  assert.ok(document.querySelector('a[href="/signup"]'));
  assert.doesNotMatch(document.body.textContent, /demo/i);
  assert.match(document.body.textContent, /illustrative sample data/);
});
test('overview loads current rotation, quotas, schedule, and personal notes', async () => {
  await mount('/');
  assert.match(document.body.textContent, /Alex/);
  assert.match(document.querySelector('.rotation-overview').textContent, /Hematology/);
  assert.match(document.querySelector('.overview-stat-grid').textContent, /73%/);
  assert.equal(document.querySelectorAll('.agenda-row').length, 3);
  assert.equal(document.querySelectorAll('.notebook-list>a').length, 2);
  assert.equal(document.querySelector('.demo-notice'), null);
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
  const { data } = await fixtureClient.from('notes').select().ilike('title', '%integration test%');
  assert.equal(data.length, 1);
  assert.match(document.querySelector('.ns-grid').textContent, /My integration test note/);
});
test('search renders record titles as safe text and opens the matching note', async () => {
  await mount('/');
  await fixtureClient.from('notes').insert({
    user_id: 'test-intern',
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
  const { data } = await fixtureClient
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
  const { data: doc } = await fixtureClient
    .from('documents')
    .insert({
      user_id: 'test-intern',
      file_name: 'Test reference.pdf',
      file_url: 'https://example.test/reference.pdf',
      storage_path: 'test-intern/test.pdf',
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
  assert.ok((await fixtureClient.from('documents').select().eq('id', doc.id).single()).data);
  await click(document.querySelector('.dc-delete-btn'));
  await click(buttons('Remove document')[0]);
  assert.equal(
    (await fixtureClient.from('documents').select().eq('id', doc.id).maybeSingle()).data,
    null,
  );
  assert.equal(document.querySelector('.dc-card'), null);
});
test('chat uses the authenticated API and persists the conversation', async () => {
  await mount('/ai-chat');
  await fill(document.querySelector('.pip-ta'), 'Help me plan my study week');
  await click(document.querySelector('.pip-send'));
  for (let i = 0; i < 4; i++) await act(async () => delay(20));
  assert.match(document.body.textContent, /Choose one topic at a time/);
  assert.equal(document.querySelector('button button'), null);
  const { data } = await fixtureClient.from('chat_messages').select();
  assert.equal(data.length, 2);
  assert.equal(data[1].role, 'assistant');
});

test('calendar expands, switches to month, and preserves selected dates', async () => {
  await mount('/shifts');
  await click(document.querySelector('[aria-label="Expand calendar"]'));
  const dialog = document.querySelector('[role="dialog"]');
  assert.ok(dialog);
  await click(
    [...dialog.querySelectorAll('.schedule-views button')].find((b) => b.textContent === 'Month'),
  );
  assert.ok(dialog.querySelectorAll('.schedule-day').length >= 28);
  await click(
    [...dialog.querySelectorAll('button')].find((b) => b.textContent.includes('Select days')),
  );
  const days = dialog.querySelectorAll('.schedule-day');
  await click(days[1]);
  await click(days[4]);
  assert.equal(dialog.querySelectorAll('.is-selected').length, 2);
  await escape();
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.equal(document.querySelectorAll('.schedule-grid .is-selected').length, 2);
  await click(buttons('Cancel selection')[0]);
  assert.equal(document.querySelectorAll('.is-selected').length, 0);
});
test('multi-day shift saves identical details to each date and an edit changes only one record', async () => {
  await mount('/shifts');
  const before = (await fixtureClient.from('shifts').select()).data.length;
  await click(buttons('Select days')[0]);
  const dayButtons = [...document.querySelectorAll('.schedule-day')];
  await click(dayButtons[0]);
  await click(dayButtons[2]);
  await click(dayButtons[5]);
  await click(buttons('Continue')[0]);
  const sheet = document.querySelector('.m-sheet');
  assert.ok(sheet);
  assert.equal(sheet.querySelectorAll('.batch-date-list > span').length, 2);
  await fill(sheet.querySelector('textarea'), 'Batch schedule regression');
  await click(sheet.querySelector('.m-submit'));
  const rows = (await fixtureClient.from('shifts').select()).data;
  const added = rows.filter((s) => s.notes === 'Batch schedule regression');
  assert.equal(rows.length, before + 3);
  assert.equal(added.length, 3);
  assert.equal(new Set(added.map((s) => s.shift_date)).size, 3);
  assert.ok(
    added.every(
      (s) => s.start_time === '07:00' && s.end_time === '15:00' && s.user_id === 'test-intern',
    ),
  );
  const row = [...document.querySelectorAll('.sp-shift-row')].find((e) =>
    e.textContent.includes('Batch schedule regression'),
  );
  await click(row.querySelector('.sp-icon-btn'));
  assert.equal(document.querySelector('.batch-add-row'), null);
  await fill(document.querySelector('.m-sheet textarea'), 'One edited shift');
  await click(document.querySelector('.m-submit'));
  const edited = (await fixtureClient.from('shifts').select()).data;
  assert.equal(edited.length, rows.length);
  assert.equal(edited.filter((s) => s.notes === 'One edited shift').length, 1);
  assert.equal(edited.filter((s) => s.notes === 'Batch schedule regression').length, 2);
});
test('multi-day exam repeats the title and section, and cancel leaves records unchanged', async () => {
  await mount('/shifts');
  await click(buttons('Exam Dates')[0]);
  const before = (await fixtureClient.from('exams').select()).data.length;
  await click(buttons('Select days')[0]);
  const days = document.querySelectorAll('.schedule-day');
  await click(days[1]);
  await click(days[6]);
  await click(buttons('Continue')[0]);
  await fill(document.querySelector('.m-sheet input[type="text"]'), 'Batch assessment');
  await click(document.querySelector('.m-submit'));
  const rows = (await fixtureClient.from('exams').select()).data;
  assert.equal(rows.length, before + 2);
  assert.equal(rows.filter((e) => e.exam_name === 'Batch assessment').length, 2);
  await click(document.querySelector('.schedule-add'));
  await click(document.querySelector('.m-cancel'));
  assert.equal((await fixtureClient.from('exams').select()).data.length, rows.length);
});
test('mobile Pip history traps focus, restores the opener, and confirms deletion', async () => {
  const oldWidth = window.innerWidth;
  window.innerWidth = 390;
  try {
    await mount('/ai-chat');
    assert.equal(document.querySelector('.pip-layout > aside'), null);
    await fill(document.querySelector('.pip-ta'), 'A small study plan');
    await click(document.querySelector('.pip-send'));
    const opener = document.querySelector('[aria-label="Conversation history"]');
    opener.focus();
    await click(opener);
    let dialog = document.querySelector('[role="dialog"]');
    assert.ok(dialog);
    assert.ok(dialog.contains(document.activeElement));
    await escape();
    assert.equal(document.activeElement, opener);
    await click(opener);
    await click(document.querySelector('.pip-cdel'));
    assert.equal(document.querySelectorAll('[role="dialog"]').length, 1);
    await click(buttons('Keep chat')[0]);
    assert.equal((await fixtureClient.from('chat_messages').select()).data.length, 2);
    await click(opener);
    await click(document.querySelector('.pip-cdel'));
    await click(buttons('Delete chat')[0]);
    assert.equal((await fixtureClient.from('chat_messages').select()).data.length, 0);
  } finally {
    window.innerWidth = oldWidth;
  }
});

test('a failed multi-day save keeps the form and dates available for retry', async () => {
  await mount('/shifts');
  await click(buttons('Select days')[0]);
  const days = document.querySelectorAll('.schedule-day');
  await click(days[1]);
  await click(days[3]);
  await click(buttons('Continue')[0]);
  const original = fixtureClient.from;
  const before = (await fixtureClient.from('shifts').select()).data.length;
  fixtureClient.from = (table) => {
    if (table !== 'shifts') return original.call(fixtureClient, table);
    return {
      insert: () => ({
        select: async () => {
          throw new Error('Temporary connection failure');
        },
      }),
    };
  };
  try {
    await click(document.querySelector('.m-submit'));
    assert.match(document.querySelector('.m-err').textContent, /Temporary connection failure/);
    assert.ok(document.querySelector('.m-sheet'));
    assert.equal(document.querySelector('.m-submit').disabled, false);
    assert.equal(document.querySelectorAll('.batch-date-list>span').length, 1);
  } finally {
    fixtureClient.from = original;
  }
  assert.equal((await fixtureClient.from('shifts').select()).data.length, before);
  await click(document.querySelector('.m-submit'));
  assert.equal(document.querySelector('.m-sheet'), null);
  assert.equal((await fixtureClient.from('shifts').select()).data.length, before + 2);
});
test('dialogs and Pip resize with the visible viewport', async () => {
  const oldViewport = window.visualViewport;
  const viewport = new dom.window.EventTarget();
  viewport.height = 700;
  viewport.offsetTop = 0;
  window.visualViewport = viewport;
  try {
    await mount('/notes?new=1');
    assert.equal(
      document.querySelector('[role="dialog"]').style.getPropertyValue('--dialog-height'),
      '700px',
    );
    await act(async () => {
      viewport.height = 400;
      viewport.offsetTop = 15;
      viewport.dispatchEvent(new Event('resize'));
    });
    assert.equal(
      document.querySelector('[role="dialog"]').style.getPropertyValue('--dialog-height'),
      '400px',
    );
    assert.equal(
      document.querySelector('[role="dialog"]').style.getPropertyValue('--dialog-top'),
      '15px',
    );
    await escape();
    await mount('/ai-chat');
    assert.equal(
      document.querySelector('.pip-workspace').style.getPropertyValue('--viewport-height'),
      '400px',
    );
    assert.ok(document.querySelector('.keyboard-open'));
    await act(async () => {
      viewport.height = 700;
      viewport.dispatchEvent(new Event('resize'));
    });
    assert.equal(
      document.querySelector('.pip-workspace').style.getPropertyValue('--viewport-height'),
      '700px',
    );
    assert.equal(document.querySelector('.keyboard-open'), null);
  } finally {
    window.visualViewport = oldViewport;
  }
});

test('profile offers appearance preferences without export or demo controls', async () => {
  await mount('/profile');
  assert.ok(document.querySelector('.theme-segment'));
  assert.equal(document.querySelectorAll('.preference-row').length, 1);
  assert.doesNotMatch(
    document.body.textContent,
    /Export data|JSON backup|Reset demo|Leave demo|Exit demo/i,
  );
});
test('phone wellness choices include text labels and save the chosen mood', async () => {
  const oldWidth = window.innerWidth;
  window.innerWidth = 390;
  try {
    await mount('/');
    const choices = [...document.querySelectorAll('.care-mood button')];
    assert.deepEqual(
      choices.map((b) => b.querySelector('small').textContent),
      ['Feeling good', 'Doing okay', 'A little tired', 'Need a hug'],
    );
    await click(choices[2]);
    assert.equal(choices[2].getAttribute('aria-pressed'), 'true');
    const { data } = await fixtureClient.from('mood_logs').select();
    assert.equal(data.at(-1).mood_tag, 'tired');
    await mount('/shifts');
    assert.match(
      document.querySelector('.sp-hydration-help').textContent,
      /Tap the number of glasses/,
    );
    const cups = [...document.querySelectorAll('.sp-cup')];
    assert.equal(cups[0].querySelector('.sp-cup-label').textContent, '1 glass');
    assert.match(cups[7].textContent, /8 glasses/);
    await click(cups[2]);
    assert.match(document.querySelector('.sp-hydration-count').textContent, /3\/8 glasses/);
    await click(cups[1]);
    assert.match(document.querySelector('.sp-hydration-count').textContent, /2\/8 glasses/);
    await click(document.querySelector('.sp-water-reset'));
    assert.match(document.querySelector('.sp-hydration-count').textContent, /0\/8 glasses/);
  } finally {
    window.innerWidth = oldWidth;
  }
});

test('Notes uses a labeled toolbar action on phones and opens its editor', async () => {
  const width = window.innerWidth;
  window.innerWidth = 390;
  try {
    await mount('/notes');
    assert.equal(document.querySelector('.ns-fab'), null);
    const add = document.querySelector('.ns-toolbar .ns-new-btn');
    assert.match(add.textContent, /Add Note/);
    assert.ok(add.classList.contains('primary'));
    assert.ok(add.querySelector('svg'));
    add.focus();
    await click(add);
    assert.ok(document.querySelector('.nm-sheet'));
    await escape();
    assert.equal(document.activeElement, add);
  } finally {
    window.innerWidth = width;
  }
});
test('saved emoji safety reminders render as icons and can use the labeled selector', async () => {
  await mount('/rotations');
  await fixtureClient
    .from('user_settings')
    .upsert(
      [
        {
          user_id: 'test-intern',
          key: 'rotation_guide.safety.Hematology',
          value: [{ icon: '\u{1f9e4}', text: 'Existing glove reminder' }],
        },
      ],
      { onConflict: 'user_id,key' },
    );
  await click(document.querySelectorAll('.rg-main-tab')[1]);
  await click(buttons('Safety Reminders')[0]);
  for (let i = 0; i < 3; i++) await act(async () => delay(20));
  const card = document.querySelector('.safety-card');
  assert.match(card.textContent, /Existing glove reminder/);
  assert.ok(card.querySelector('.safety-icon svg.lucide-hand'));
  assert.doesNotMatch(card.textContent, /\u{1f9e4}/u);
  await click(card.querySelector('.sg-item-btn'));
  const picker = document.querySelector('select[aria-label="Reminder icon"]');
  assert.equal(picker.value, 'Hand');
  await act(async () => {
    picker.value = 'Thermometer';
    picker.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await click(document.querySelector('.sg-edit-row .sg-save-btn'));
  assert.ok(document.querySelector('.safety-icon svg.lucide-thermometer'));
  const { data } = await fixtureClient
    .from('user_settings')
    .select('value')
    .eq('key', 'rotation_guide.safety.Hematology')
    .maybeSingle();
  assert.equal(data.value[0].icon, 'Thermometer');
  assert.equal(data.value[0].text, 'Existing glove reminder');
});
