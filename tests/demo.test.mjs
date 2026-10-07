import test from 'node:test';
import assert from 'node:assert/strict';
import { demoClient, DEMO_USER, isDemoMode } from '../src/lib/demo.js';
import { localDate } from '../src/lib/dates.js';
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) || null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};
test.beforeEach(() => store.clear());
test('calendar dates retain the local day at midnight', () =>
  assert.equal(localDate(new Date(2026, 9, 7, 0, 5)), '2026-10-07'));
test('demo is opt-in and starts with a current rotation', async () => {
  assert.equal(isDemoMode(), false);
  localStorage.setItem('medtech-demo', 'true');
  assert.equal(isDemoMode(), true);
  const { data } = await demoClient
    .from('rotations')
    .select()
    .eq('user_id', DEMO_USER.id)
    .lte('start_date', localDate())
    .gte('end_date', localDate())
    .single();
  assert.equal(data.section_name, 'Hematology');
});
test('notes persist across reads and edits stay scoped to their owner', async () => {
  const { data: note } = await demoClient
    .from('notes')
    .insert({ user_id: DEMO_USER.id, title: 'My new note', body: 'A useful reminder.' })
    .select()
    .single();
  await demoClient
    .from('notes')
    .update({ title: 'Updated note' })
    .eq('id', note.id)
    .eq('user_id', 'another-user');
  let result = await demoClient.from('notes').select().eq('id', note.id).single();
  assert.equal(result.data.title, 'My new note');
  await demoClient
    .from('notes')
    .update({ title: 'Updated note' })
    .eq('id', note.id)
    .eq('user_id', DEMO_USER.id);
  result = await demoClient.from('notes').select().eq('id', note.id).single();
  assert.equal(result.data.title, 'Updated note');
  await demoClient.from('notes').delete().eq('id', note.id).eq('user_id', DEMO_USER.id);
  assert.equal(
    (await demoClient.from('notes').select().eq('id', note.id).maybeSingle()).data,
    null,
  );
});
test('settings upsert updates rather than duplicating a user preference', async () => {
  await demoClient
    .from('user_settings')
    .upsert(
      { user_id: DEMO_USER.id, key: 'sections', value: ['Hematology'] },
      { onConflict: 'user_id,key' },
    );
  await demoClient
    .from('user_settings')
    .upsert(
      { user_id: DEMO_USER.id, key: 'sections', value: ['Hematology', 'Blood Bank'] },
      { onConflict: 'user_id,key' },
    );
  const { data } = await demoClient.from('user_settings').select().eq('user_id', DEMO_USER.id);
  assert.equal(data.length, 1);
  assert.equal(data[0].value.length, 2);
});
test('agenda sorting and search filters return relevant records', async () => {
  const { data: shifts } = await demoClient
    .from('shifts')
    .select()
    .order('shift_date', { ascending: true })
    .limit(2);
  assert.equal(shifts.length, 2);
  assert.ok(shifts[0].shift_date <= shifts[1].shift_date);
  const { data: notes } = await demoClient
    .from('notes')
    .select()
    .or('title.ilike.%senior%,body.ilike.%senior%');
  assert.equal(notes.length, 1);
  assert.equal(notes[0].is_staff_tip, true);
});
test('demo uploads cannot send files to the real account backend', async () => {
  const { error } = await demoClient.storage
    .from('documents')
    .upload('test.pdf', new Blob(['test']));
  assert.match(error.message, /real account/);
});
