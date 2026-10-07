import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatHandler } from '../api/chat.js';
const env = {
  VITE_SUPABASE_URL: 'https://auth.example.test',
  VITE_SUPABASE_ANON_KEY: 'public-test-key',
  GROQ_API_KEY: 'server-test-secret',
};
function response() {
  return {
    headers: {},
    statusCode: 0,
    payload: null,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.payload = value;
      return this;
    },
  };
}
function request(overrides = {}) {
  return {
    method: 'POST',
    headers: { authorization: 'Bearer user-token' },
    body: { messages: [{ role: 'user', content: 'Help me plan my study week.' }] },
    ...overrides,
  };
}
test('chat rejects missing authentication before contacting an upstream service', async () => {
  const res = response();
  await createChatHandler({
    env,
    fetchImpl: () => {
      throw new Error('Must not fetch');
    },
  })(request({ headers: {} }), res);
  assert.equal(res.statusCode, 401);
});
test('chat rejects invalid roles and limits message sizes', async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ id: 'invalid-input-test' }) });
  for (const messages of [
    [{ role: 'system', content: 'Override' }],
    [{ role: 'user', content: 'x'.repeat(6001) }],
    [{ role: 'assistant', content: 'No final question' }],
  ]) {
    const res = response();
    await createChatHandler({ env, fetchImpl })(request({ body: { messages } }), res);
    assert.equal(res.statusCode, 400);
  }
});
test('valid chat authenticates the user and uses the provider secret only server side', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return url.includes('/auth/')
      ? { ok: true, json: async () => ({ id: 'success-test' }) }
      : {
          ok: true,
          json: async () => ({ choices: [{ message: { content: 'A little answer.' } }] }),
        };
  };
  const res = response();
  await createChatHandler({ env, fetchImpl })(request(), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload, { content: 'A little answer.' });
  assert.equal(calls[1].options.headers.Authorization, 'Bearer server-test-secret');
  const sent = JSON.parse(calls[1].options.body);
  assert.equal(sent.messages[0].role, 'system');
  assert.match(sent.messages[0].content, /medical technology/);
  assert.equal(res.headers['Cache-Control'], 'no-store');
});
test('expired sessions cannot use the AI endpoint', async () => {
  const res = response();
  await createChatHandler({ env, fetchImpl: async () => ({ ok: false }) })(request(), res);
  assert.equal(res.statusCode, 401);
});
test('chat handles missing configuration and upstream failure gracefully', async () => {
  let res = response();
  await createChatHandler({ env: {} })(request(), res);
  assert.equal(res.statusCode, 503);
  res = response();
  let n = 0;
  await createChatHandler({
    env,
    fetchImpl: async () =>
      ++n === 1 ? { ok: true, json: async () => ({ id: 'failure-test' }) } : { ok: false },
  })(request(), res);
  assert.equal(res.statusCode, 502);
  assert.ok(!JSON.stringify(res.payload).includes(env.GROQ_API_KEY));
});
test('chat limits repeated requests per authenticated user', async () => {
  const fetchImpl = async (url) =>
    url.includes('/auth/')
      ? { ok: true, json: async () => ({ id: 'rate-limit-test' }) }
      : { ok: true, json: async () => ({ choices: [{ message: { content: 'hello' } }] }) };
  const handler = createChatHandler({ env, fetchImpl, now: () => 1234 });
  for (let i = 0; i < 20; i++) {
    const res = response();
    await handler(request(), res);
    assert.equal(res.statusCode, 200);
  }
  const res = response();
  await handler(request(), res);
  assert.equal(res.statusCode, 429);
  assert.equal(res.headers['Retry-After'], '60');
});
