const SYSTEM_PROMPT =
  'You are Pip, a warm study companion for medical technology interns in the Philippines. Focus on hematology, clinical chemistry, microbiology, blood banking, histopathology, study organization, and encouragement. Use friendly plain language and Taglish when the user does. Discuss educational concepts; do not diagnose patients, prescribe drugs, provide patient-specific treatment, or replace the laboratory SOP or clinical supervisor. Never request identifiable patient data. For clinical topics remind the learner to verify with their instructor and approved local protocols. Be honest about uncertainty.';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const PROVIDER_CODES = new Set([
  'invalid_api_key',
  'authentication_error',
  'model_not_found',
  'model_decommissioned',
  'model_permission_blocked',
  'rate_limit_exceeded',
  'insufficient_quota',
  'billing_hard_limit_reached',
  'context_length_exceeded',
]);
const requests = new Map();
export function createChatHandler({
  env = process.env,
  fetchImpl = fetch,
  now = Date.now,
  logger = console,
} = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const reply = (status, message) => res.status(status).json({ error: message });
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return reply(405, 'Use POST to send a message.');
    }
    const url = env.VITE_SUPABASE_URL?.trim(),
      key = env.VITE_SUPABASE_ANON_KEY?.trim(),
      groqKey = env.GROQ_API_KEY?.trim(),
      model = env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
    if (!groqKey || !url || !key)
      return reply(
        503,
        'Pip’s study chat is being set up. Your notes and other tools are still here.',
      );
    const authorization = req.headers.authorization || '';
    if (!authorization.startsWith('Bearer ')) return reply(401, 'Please sign in to chat with Pip.');
    try {
      const verified = await fetchImpl(url + '/auth/v1/user', {
        headers: { apikey: key, Authorization: authorization },
        signal: AbortSignal.timeout(8000),
      });
      if (!verified.ok) return reply(401, 'Your session expired. Please sign in again.');
      const user = await verified.json();
      if (!user.id) return reply(401, 'Please sign in again.');
      let body = req.body;
      if (!body) {
        let raw = '';
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 24000)
            return reply(413, 'That message is a little too long. Please shorten it.');
        }
        try {
          body = JSON.parse(raw);
        } catch {
          return reply(400, 'Please send a valid message.');
        }
      }
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          return reply(400, 'Please send a valid message.');
        }
      }
      const messages = body?.messages;
      if (
        !Array.isArray(messages) ||
        !messages.length ||
        messages.length > 8 ||
        messages.some(
          (m) =>
            !['user', 'assistant'].includes(m.role) ||
            typeof m.content !== 'string' ||
            !m.content.trim() ||
            m.content.length > 6000,
        ) ||
        messages.at(-1).role !== 'user' ||
        JSON.stringify(messages).length > 24000
      )
        return reply(400, 'Please send a shorter conversation with a question at the end.');
      const time = now();
      for (const [id, entry] of requests) {
        if (time - entry.start > 60000) requests.delete(id);
      }
      const rate = requests.get(user.id) || { start: time, count: 0 };
      if (rate.count >= 20) {
        res.setHeader('Retry-After', '60');
        return reply(429, 'Let’s take a little breather. Try again in a minute.');
      }
      rate.count++;
      requests.set(user.id, rate);
      const upstream = await fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + groqKey,
        },
        body: JSON.stringify({
          model,
          max_completion_tokens: 2048,
          ...(model.startsWith('openai/gpt-oss-')
            ? { reasoning_effort: 'low', include_reasoning: false }
            : {}),
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!upstream.ok) {
        // Log only known error codes and HTTP status, never provider messages or credentials.
        const failure = await upstream.json?.().catch(() => null);
        const code = PROVIDER_CODES.has(failure?.error?.code) ? failure.error.code : 'unknown';
        logger.error('Pip provider request failed', { status: upstream.status, code });
        if (upstream.status === 401)
          return reply(
            503,
            'Pip’s AI connection needs a valid API key. Please ask the app owner to check the setup.',
          );
        if (['model_not_found', 'model_decommissioned'].includes(code) || upstream.status === 404)
          return reply(
            503,
            'Pip’s AI model is unavailable. Please ask the app owner to update its setup.',
          );
        if (upstream.status === 403)
          return reply(
            503,
            'Pip’s AI model is not enabled for this app. Please ask the app owner to check model access.',
          );
        if (['insufficient_quota', 'billing_hard_limit_reached'].includes(code))
          return reply(
            503,
            'Pip’s AI usage allowance has been reached. Please ask the app owner to check the account.',
          );
        if (upstream.status === 429) {
          const retry = Number(upstream.headers?.get('retry-after'));
          res.setHeader(
            'Retry-After',
            String(Number.isFinite(retry) && retry > 0 ? Math.min(Math.ceil(retry), 3600) : 60),
          );
          return reply(
            429,
            'Pip is receiving too many messages right now. Please try again shortly.',
          );
        }
        if (code === 'context_length_exceeded' || upstream.status === 413)
          return reply(
            400,
            'This conversation is too long for Pip. Please start a new chat or send a shorter message.',
          );
        return reply(502, 'Pip couldn’t answer right now. Please try again in a moment.');
      }
      const data = await upstream.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return reply(502, 'Pip couldn’t find the words. Please try again.');
      return res.status(200).json({ content });
    } catch (error) {
      logger.error('Study chat failed:', error.name);
      return reply(502, 'Pip couldn’t connect. Please try again in a moment.');
    }
  };
}
export default createChatHandler();
