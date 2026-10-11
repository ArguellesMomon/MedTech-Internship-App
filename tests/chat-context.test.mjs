import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChatMessages, CHAT_LIMITS } from '../src/lib/chat.js';

test('long replies are shortened only in request context and preserve the latest question', () => {
  const history = [
    { role: 'user', content: 'Explain hematology.' },
    { role: 'assistant', content: 'A detailed explanation. '.repeat(500) },
    { role: 'user', content: 'Can you explain the last point?' },
  ];
  const original = structuredClone(history);
  const messages = buildChatMessages(history);
  assert.deepEqual(history, original);
  assert.deepEqual(messages.at(-1), history.at(-1));
  assert.equal(messages[1].content.length, CHAT_LIMITS.messageCharacters);
  assert.match(messages[1].content, /shortened for context/);
});

test('a large conversation drops oldest context within the full request budget', () => {
  const history = Array.from({ length: 21 }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: `${index}:` + 'x'.repeat(5995),
  }));
  const messages = buildChatMessages(history);
  assert.ok(messages.length < CHAT_LIMITS.messages);
  assert.ok(JSON.stringify({ messages }).length <= CHAT_LIMITS.requestCharacters);
  assert.deepEqual(messages.at(-1), history.at(-1));
  assert.deepEqual(messages, history.slice(-messages.length));
});

test('context counts JSON escaping and request overhead rather than plain text length', () => {
  const history = Array.from({ length: 9 }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: '"\\\n'.repeat(1900),
  }));
  const messages = buildChatMessages(history);
  assert.ok(JSON.stringify({ messages }).length <= CHAT_LIMITS.requestCharacters);
  assert.equal(messages.at(-1).content, history.at(-1).content.trim());
});

test('short conversations retain recent context and greetings need no question mark', () => {
  const history = Array.from({ length: 21 }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: index === 20 ? 'Hello Chami' : `Message ${index}`,
  }));
  assert.deepEqual(buildChatMessages(history), history.slice(-CHAT_LIMITS.messages));
});

test('invalid or oversized new messages are rejected without silently truncating them', () => {
  for (const content of ['x'.repeat(6001), '\u0000'.repeat(5000)]) {
    assert.throws(() => buildChatMessages([{ role: 'user', content }]), /too long/);
  }
  for (const history of [
    [],
    [{ role: 'assistant', content: 'Hello' }],
    [{ role: 'user', content: '  ' }],
  ]) {
    assert.throws(() => buildChatMessages(history), /enter a message/);
  }
});
