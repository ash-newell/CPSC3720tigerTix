/**
 * @file clientModel.js
 * @description Model layer for the Client Microservice.
 * This module handles all database operations related to viewing and purchasing tickets.
 * It interacts directly with the shared SQLite database used by both services.
 */

const path = require("path");
const sqlite3 = require("sqlite3").verbose();

/**
 * Establishes a persistent connection to the shared SQLite database.
 * `path.resolve(__dirname, "../../shared-db/database.sqlite")` ensures that
 * both the admin-service and client-service always access the same DB,
 * regardless of where `node` is started from.
 */
const dbPath = path.resolve(__dirname, "../../shared-db/database.sqlite");
console.log("Connecting to SQLite DB at:", dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) console.error("SQLite connection error:", err.message);
  else console.log("Connected to shared SQLite database.");
});

/**
 * Retrieves all events stored in the Events table.
 * 
 * @function getAllEvents
 * @param {function} callback - A callback function with parameters (error, rows).
 * @description
 * Use SQL SELECT query to fetch every event currently stored
 * in the database. the results are passed to the provided callback.
 * 
 * This function is used by the Client Controller when responding to a 
 * GET request. It allows the frontend to display the list of all active or available events.
 * 
 */
function getAllEvents(callback) {
  db.all("SELECT * FROM Events", [], callback);
}

/**
 * Handles the purchase of a single available ticket for a specific event.
 * 
 * @function buyTicket
 * @param {number} eventID - The unique ID of the event for which a ticket is being purchased.
 * @param {number} buyerID - The ID of the user purchasing the ticket.
 * @param {function} callback - A callback function with parameters (error, result).
 * 
 * @description
 *  Query for an available ticket: 
 *    Finds the first available ticket for the given event using
 *    an SQL SELECT with LIMIT 1. The ORDER BY seat_number
 *    ensures consistent seat assignment order (like SEAT-001, SEAT-002...).
 * 
 *  Update ticket status:
 *    Once a ticket is found, its record is updated using an SQL UPDATE query.  
 *    The status changes from `'available'` → `'sold'`, and `buyerID` plus 
 *    `purchase_time` are recorded. This ensures atomic ticket claiming.
 * 
 *  Reflect purchase in Events table: 
 *    Decrements the total `num_tickets` count in the `Events` table.  
 *    This step ensures the frontend display remains synchronized with 
 *    the actual availability in the Tickets table.
 * 
 *  Return confirmation:**  
 *    If successful, the callback returns the purchased ticket’s ID and seat number.
 */

function buyTicket(eventID, buyerID, callback) {
  db.get(
    "SELECT * FROM Tickets WHERE eventID = ? AND status = 'available' ORDER BY seat_number LIMIT 1",
    [eventID],
    (err, ticket) => {
      if (err) return callback(err);
      if (!ticket) return callback({ message: "No available tickets" });

      const purchase_time = new Date().toISOString();

      db.run(
        "UPDATE Tickets SET buyerID = ?, status = 'sold', purchase_time = ? WHERE ticketID = ?",
        [buyerID, purchase_time, ticket.ticketID],
        (updateErr) => {
          if (updateErr) return callback(updateErr);

          // Reflect the purchase in the Events table to keep ticket count accurate
          db.run(
            "UPDATE Events SET num_tickets = num_tickets - 1 WHERE eventID = ?",
            [eventID]
          );

          // Return confirmation to  controller
          callback(null, {
            ticketID: ticket.ticketID,
            seat_number: ticket.seat_number,
            message: "Purchase successful",
          });
        }
      );
    }
  );
}

/**
 * Exports the database operations for the Client Controller 
 * keeping Input output logic separate from request handling
 */
module.exports = { getAllEvents, buyTicket };