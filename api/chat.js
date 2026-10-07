const SYSTEM_PROMPT =
  'You are Pip, a warm study companion for medical technology interns in the Philippines. Focus on hematology, clinical chemistry, microbiology, blood banking, histopathology, study organization, and encouragement. Use friendly plain language and Taglish when the user does. Discuss educational concepts; do not diagnose patients, prescribe drugs, provide patient-specific treatment, or replace the laboratory SOP or clinical supervisor. Never request identifiable patient data. For clinical topics remind the learner to verify with their instructor and approved local protocols. Be honest about uncertainty.';
const requests = new Map();
export function createChatHandler({ env = process.env, fetchImpl = fetch, now = Date.now } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const reply = (status, message) => res.status(status).json({ error: message });
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return reply(405, 'Use POST to send a message.');
    }
    const url = env.VITE_SUPABASE_URL,
      key = env.VITE_SUPABASE_ANON_KEY;
    if (!env.GROQ_API_KEY || !url || !key)
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
          Authorization: 'Bearer ' + env.GROQ_API_KEY,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1024,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!upstream.ok)
        return reply(502, 'Pip couldn’t answer right now. Please try again in a moment.');
      const data = await upstream.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return reply(502, 'Pip couldn’t find the words. Please try again.');
      return res.status(200).json({ content });
    } catch (error) {
      console.error('Study chat failed:', error.name);
      return reply(502, 'Pip couldn’t connect. Please try again in a moment.');
    }
  };
}
export default createChatHandler();
