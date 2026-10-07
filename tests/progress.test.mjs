import test from 'node:test';
import assert from 'node:assert/strict';
import { withLoggedProgress } from '../src/lib/progress.js';
test('quota progress uses logged procedures without double-counting manual totals', () => {
  const quotas = [
    { section_name: 'Hematology', task_name: 'CBC', completed_count: 8, target_count: 20 },
  ];
  let progress = withLoggedProgress(quotas, [
    { section_name: 'Hematology', procedure_name: 'CBC', count_done: 4 },
  ]);
  assert.equal(progress[0].completed_count, 8);
  progress = withLoggedProgress(quotas, [
    { section_name: 'Hematology', procedure_name: ' cbc ', count_done: 12 },
  ]);
  assert.equal(progress[0].completed_count, 12);
  assert.equal(quotas[0].completed_count, 8);
});
test('procedure counts stay separate across rotations', () => {
  const quotas = [
    {
      section_name: 'Hematology',
      task_name: 'Sample preparation',
      completed_count: 0,
      target_count: 20,
    },
  ];
  const result = withLoggedProgress(quotas, [
    { section_name: 'Microbiology', procedure_name: 'Sample preparation', count_done: 15 },
  ]);
  assert.equal(result[0].completed_count, 0);
});
