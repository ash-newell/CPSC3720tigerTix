import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build absolute path correctly, even if folders have spaces
const dbPath = path.join(__dirname, "..", "..", "shared-db", "database.sqlite");

// Check path before opening
if (!fs.existsSync(dbPath)) {
  console.error(" Database file not found at:", dbPath);
} else {
  console.log(" Database found at:", dbPath);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Failed to open database:", err.message);
  else console.log("Connected to SQLite database");
});

// Get all events
export function getAllEvents(callback) {
  // Map actual DB columns (title → name, num_tickets → total_tickets)
  db.all("SELECT title AS name, num_tickets AS total_tickets FROM EVENTS", callback);
}

// Get a specific event by partial name
export function getEventByName(eventName, callback) {
  db.get(
    "SELECT eventID AS id, num_tickets AS total_tickets FROM EVENTS WHERE LOWER(title) LIKE LOWER(?)",
    [`%${eventName}%`],
    callback
  );
}

// Update tickets for an event
export function updateTickets(eventId, qty, callback) {
  db.run(
    "UPDATE EVENTS SET num_tickets = num_tickets - ? WHERE eventID = ?",
    [qty, eventId],
    callback
  );
}