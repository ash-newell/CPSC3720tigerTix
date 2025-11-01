export function parseIntent(message) {
  const lower = (message || "").toLowerCase().trim();
  if (!lower) return { intent: "unknown", event: null, quantity: null };

  if (lower.includes("show") && lower.includes("event"))
    return { intent: "show", event: null, quantity: null };

// Match "book", optional quantity, the word "ticket" or "tickets", then "for", then the event name
const bookRe = /book\s*(\d+)?\s*(?:tickets?|ticket)?\s*for\s+(.+)$/i;
const m = lower.match(bookRe);
if (m) {
  const qty = m[1] ? parseInt(m[1], 10) : 1;
  const ev = (m[2] || "").trim();
  return { intent: "book", event: ev, quantity: isNaN(qty) ? 1 : qty };
}

  if (/^yes\b.*\bbook\b/.test(lower))
    return { intent: "confirm", event: null, quantity: null };

  if (/^(hi|hello|hey)\b/.test(lower))
    return { intent: "greet", event: null, quantity: null };

  return { intent: "unknown", event: null, quantity: null };
}