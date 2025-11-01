import { getAllEvents, getEventByName, updateTickets } from "../models/bookingModel.js";
import { parseIntent } from "../utils/intentParser.js";

//const db = new sqlite3.Database("../shared-db/database.sqlite");


export const parseOnly = (req, res) => {
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: "Message required" });

  const parsed = parseIntent(message);
  if (parsed.intent === "unknown") {
    return res.status(422).json({
      error: "Could not parse your request.",
      example: { intent: "book", event: "Blues Night", tickets: 2 }
    });
  }
  return res.json({
    intent: parsed.intent,
    event: parsed.event,
    tickets: parsed.quantity
  });
};


export const handleChat = (req, res) => {
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: "Message required" });

  const lower = message.toLowerCase();
  const parsed = parseIntent(message);

  // Greet user
  if (/^(hi|hello|hey)\b/.test(lower)) {
    return res.json({
      reply:
        "Hello! I'm your TigerTix assistant (guest). You can say 'show events' or 'book 2 tickets for Jazz Night'."
    });
  }

// Show events
if (parsed.intent === "show") {
  getAllEvents((err, rows) => {
    if (err) return res.status(500).json({ reply: "Database error." });
    const list = rows
      .map(r => `${r.name} (${r.total_tickets} left)`)
      .join(", ");
    return res.json({
      reply: rows.length
        ? `Here are the available events: ${list}`
        : "No events found."
    });
  });
  return;
}

  // Propose booking
  if (parsed.intent === "book") {
    return res.json({
      reply: `I can book ${parsed.quantity || 1} ticket(s) for ${parsed.event}. Please confirm by saying "yes book ${parsed.event}".`,
      pendingBooking: parsed
    });
  }

 // Confirm booking
if (parsed.intent === "confirm") {
  const eventHint = (lower.match(/book\s+(.*)$/) || [])[1] || "Clemson";
  const qty = parsed.quantity || 1;

  getEventByName(eventHint, (err, row) => {
    if (err) return res.status(500).json({ reply: "Database error." });
    if (!row || row.total_tickets < qty) {
      return res.status(400).json({
        reply: "Sorry, that event is sold out or doesn’t have enough tickets."
      });
    }

    updateTickets(row.id, qty, (uErr) => {
      if (uErr) {
        return res.status(400).json({ reply: "Could not complete booking." });
      }
      return res.json({
        reply: `Booking confirmed! ${qty} ticket(s) booked for ${eventHint}.`
      });
    });
  });
  return;
}

  // Unknown fallback
  return res.json({
    reply: "Sorry, I didn’t understand. Try 'show events' or 'book 2 tickets for Jazz Night'."
  });
};