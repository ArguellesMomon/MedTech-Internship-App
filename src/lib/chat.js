export const CHAT_LIMITS = {
  messages: 8,
  messageCharacters: 6000,
  requestCharacters: 24000,
};

const CONTEXT_MARKER = '\n[Earlier message shortened for context]';

// Bound only the provider context. Saved messages and displayed replies stay intact.
export function buildChatMessages(history) {
  const latest = history?.at(-1);
  if (latest?.role !== 'user' || typeof latest.content !== 'string' || !latest.content.trim()) {
    throw new Error('Please enter a message for Chami.');
  }
  const messages = [{ role: 'user', content: latest.content.trim() }];
  const fits = (candidate) =>
    JSON.stringify({ messages: candidate }).length <= CHAT_LIMITS.requestCharacters;
  if (messages[0].content.length > CHAT_LIMITS.messageCharacters || !fits(messages)) {
    throw new Error('Your message is a little too long. Please shorten it and try again.');
  }
  for (
    let index = history.length - 2;
    index >= 0 && messages.length < CHAT_LIMITS.messages;
    index--
  ) {
    const message = history[index];
    if (!['user', 'assistant'].includes(message?.role) || typeof message.content !== 'string')
      continue;
    let content = message.content.trim();
    if (!content) continue;
    if (content.length > CHAT_LIMITS.messageCharacters) {
      content =
        content.slice(0, CHAT_LIMITS.messageCharacters - CONTEXT_MARKER.length) + CONTEXT_MARKER;
    }
    const candidate = [{ role: message.role, content }, ...messages];
    if (!fits(candidate)) break;
    messages.unshift(candidate[0]);
  }
  return messages;
}
