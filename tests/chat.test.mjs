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
  assert.equal(sent.model, 'openai/gpt-oss-120b');
  assert.equal(sent.max_completion_tokens, 2048);
  assert.equal(sent.reasoning_effort, 'low');
  assert.equal(sent.include_reasoning, false);
  assert.equal(sent.reasoning_format, undefined);
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
    logger: { error() {} },
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

test('provider failures distinguish key, access, retired model, rate and usage limits without leaking data', async () => {
  const cases = [
    [401, 'invalid_api_key', 503, /valid API key/],
    [403, 'model_permission_blocked', 503, /model access/],
    [400, 'model_decommissioned', 503, /model is unavailable/],
    [404, 'model_not_found', 503, /model is unavailable/],
    [429, 'rate_limit_exceeded', 429, /too many messages/],
    [429, 'insufficient_quota', 503, /usage allowance/],
    [400, 'context_length_exceeded', 400, /conversation is too long/],
    [500, 'unexpected_error', 502, /couldn’t answer/],
    [401, env.GROQ_API_KEY, 503, /valid API key/],
  ];
  for (const [index, [status, code, expectedStatus, message]] of cases.entries()) {
    const logs = [];
    const res = response();
    await createChatHandler({
      env,
      logger: { error: (...args) => logs.push(args) },
      fetchImpl: async (url) =>
        url.includes('/auth/')
          ? { ok: true, json: async () => ({ id: 'provider-error-' + index }) }
          : {
              ok: false,
              status,
              headers: { get: () => '12' },
              json: async () => ({
                error: { code, message: 'Private prompt: ' + env.GROQ_API_KEY },
              }),
            },
    })(request(), res);
    assert.equal(res.statusCode, expectedStatus);
    assert.match(res.payload.error, message);
    assert.equal(logs[0][1].status, status);
    assert.ok(!JSON.stringify([res.payload, logs]).includes(env.GROQ_API_KEY));
    assert.ok(!JSON.stringify(logs).includes('Private prompt'));
    if (expectedStatus === 429) assert.equal(res.headers['Retry-After'], '12');
  }
});
test('model overrides and padded keys work without sending unsupported reasoning options', async () => {
  let sent;
  const res = response();
  await createChatHandler({
    env: { ...env, GROQ_API_KEY: ' ' + env.GROQ_API_KEY + '\n', GROQ_MODEL: ' example/model ' },
    fetchImpl: async (url, options) => {
      if (url.includes('/auth/'))
        return { ok: true, json: async () => ({ id: 'override-model-test' }) };
      assert.equal(options.headers.Authorization, 'Bearer ' + env.GROQ_API_KEY);
      sent = JSON.parse(options.body);
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'Ready.' } }] }) };
    },
  })(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(sent.model, 'example/model');
  assert.equal(sent.reasoning_effort, undefined);
  assert.equal(sent.include_reasoning, undefined);
});
test('non-JSON provider failures use a safe fallback and whitespace keys count as missing', async () => {
  const logs = [];
  const res = response();
  await createChatHandler({
    env,
    logger: { error: (...args) => logs.push(args) },
    fetchImpl: async (url) =>
      url.includes('/auth/')
        ? { ok: true, json: async () => ({ id: 'non-json-provider-test' }) }
        : {
            ok: false,
            status: 503,
            json: async () => {
              throw new SyntaxError('private server HTML');
            },
          },
  })(request(), res);
  assert.equal(res.statusCode, 502);
  assert.deepEqual(logs[0][1], { status: 503, code: 'unknown' });
  const missing = response();
  await createChatHandler({
    env: { ...env, GROQ_API_KEY: '   ' },
    fetchImpl: () => {
      throw new Error('Should not fetch');
    },
  })(request(), missing);
  assert.equal(missing.statusCode, 503);
});
