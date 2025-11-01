export function parseIntent(message) {
  const lower = message.toLowerCase();

  if (lower.includes("show") && lower.includes("event")) {
    return { intent: "show", event: null, quantity: null };
  }

  const bookMatch = lower.match(/book\s*(\d+)?\s*ticket.*for\s+(.+)/i);
  if (bookMatch) {
    return {
      intent: "book",
      quantity: parseInt(bookMatch[1]) || 1,
      event: bookMatch[2].trim(),
    };
  }

  const confirmMatch = lower.match(/yes.*book/i);
  if (confirmMatch) return { intent: "confirm", event: null, quantity: null };

  return { intent: "unknown", event: null, quantity: null };
}