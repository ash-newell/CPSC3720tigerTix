import sqlite3 from "sqlite3";
import { parseIntent } from "../utils/intentParser.js";

const db = new sqlite3.Database("../shared-db/database.sqlite");

export const handleChat = (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  const parsed = parseIntent(message);

  switch (parsed.intent) {
    case "show":
      db.all("SELECT name, total_tickets FROM events", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const eventNames = rows.map(r => `${r.name} (${r.total_tickets} left)`).join(", ");
        return res.json({ reply: `Here are the available events: ${eventNames}` });
      });
      break;

    case "book":
      return res.json({
        reply: `I can book ${parsed.quantity} ticket(s) for ${parsed.event}. Please confirm.`,
        pendingBooking: parsed,
      });

    case "confirm":
      db.run(
        "UPDATE events SET total_tickets = total_tickets - 1 WHERE name LIKE ? AND total_tickets > 0",
        [`%Clemson%`],
        function (err) {
          if (err || this.changes === 0)
            return res.status(400).json({ reply: "Sorry, that event is sold out." });
          return res.json({ reply: "Booking confirmed! Your ticket has been booked." });
        }
      );
      break;

    default:
      return res.json({
        reply: "I'm not sure what you mean. Try 'show events' or 'book tickets for ...'.",
      });
  }
};