/**
 * @file adminModel.js
 * @description  SQL logic for creating events and generating tickets
 */

import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let createEvent;
if (process.env.NODE_ENV === "test") {
  const mod = await import("../../shared-db/inMemoryDb.js");
  createEvent = mod.createEvent;
} else {
  const sqlite3 = (await import("sqlite3")).default;
  const path = (await import("path")).default;
  const { verbose } = sqlite3;
  const dbLib = verbose();
  const dbPath = path.resolve(__dirname, "../../shared-db/database.sqlite");
  const db = new dbLib.Database(dbPath, dbLib.OPEN_READWRITE, (err) => {
    if (err) console.error("SQLite connection error:", err.message);
    else console.log("Connected to shared SQLite database.");
  });

  createEvent = function (event, callback) {
    const { title, description, start_time, end_time, address, num_tickets, organizerID, ticket_price = 50.0 } = event;
    const query = `INSERT INTO Events (title, description, start_time, end_time, address, num_tickets, organizerID)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(query, [title, description, start_time, end_time, address, num_tickets, organizerID], function (err) {
      if (err) return callback(err);
      const eventID = this.lastID;
      const ticketQuery = `INSERT INTO Tickets (eventID, seat_number, price, status)
                           VALUES (?, ?, ?, 'available')`;
      for (let i = 1; i <= num_tickets; i++) {
        const seat = `SEAT-${String(i).padStart(3, "0")}`;
        db.run(ticketQuery, [eventID, seat, ticket_price]);
      }
      callback(null, { eventID, tickets_created: num_tickets });
    });
  };
}

export { createEvent };

