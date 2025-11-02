// backend/client-service/models/clientModel.js
// this file is the db layer for client svc
// it handles reading events and updating tickets in sqlite db
// controller calls these functions when user or frontend hits endpoints like GET /events or POST /purchase
// admin svc also uses same shared db so everything stays synced between services

import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let getAllEvents;
let buyTicket;

if (process.env.NODE_ENV === 'test') {
  // Use in-memory shared DB during tests to avoid sqlite native binary and file locking issues
  const mod = await import('../../shared-db/inMemoryDb.js');
  getAllEvents = mod.getAllEvents;
  buyTicket = mod.buyTicket;
} else {
  const sqlite3 = (await import('sqlite3')).default;
  const { verbose } = sqlite3;
  const dbLib = verbose();

  // Ensure shared DB schema exists before opening connection
  const { initDatabase } = await import('../../admin-service/setup.js');
  await initDatabase();

  const dbPath = path.resolve(__dirname, '../../shared-db/database.sqlite');
  console.log('connecting to sqlite db at:', dbPath);

  const db = new dbLib.Database(dbPath, dbLib.OPEN_READWRITE, (err) => {
    if (err) console.error('sqlite connection error:', err.message);
    else console.log('connected to shared sqlite database.');
  });

  db.configure('busyTimeout', 2000);

  getAllEvents = function (callback) {
    db.all('SELECT * FROM Events', [], callback);
  };

  buyTicket = function (eventID, buyerID, callback) {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION', (beginErr) => {
        if (beginErr) {
          if (beginErr.code === 'SQLITE_BUSY' || beginErr.code === 'SQLITE_LOCKED') {
            const busyErr = new Error('sold out');
            busyErr.status = 400;
            return callback(busyErr);
          }
          return callback(beginErr);
        }

        db.get(
          "SELECT * FROM Tickets WHERE eventID = ? AND status = 'available' ORDER BY seat_number LIMIT 1",
          [eventID],
          (err, ticket) => {
            if (err) {
              db.run('ROLLBACK');
              return callback(err);
            }

            if (!ticket) {
              db.run('COMMIT');
              const soldOutErr = new Error('sold out');
              soldOutErr.status = 400;
              return callback(soldOutErr);
            }

            const purchase_time = new Date().toISOString();

            db.run(
              'UPDATE Tickets SET buyerID = ?, status = \'sold\', purchase_time = ? WHERE ticketID = ?',
              [buyerID, purchase_time, ticket.ticketID],
              (updateErr) => {
                if (updateErr) {
                  db.run('ROLLBACK');
                  return callback(updateErr);
                }

                db.run(
                  'UPDATE Events SET num_tickets = num_tickets - 1 WHERE eventID = ?',
                  [eventID],
                  (updateEventErr) => {
                    if (updateEventErr) {
                      db.run('ROLLBACK');
                      return callback(updateEventErr);
                    }

                    db.run('COMMIT');

                    callback(null, {
                      ticketID: ticket.ticketID,
                      seat_number: ticket.seat_number,
                      message: 'purchase successful',
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  };
}

export { getAllEvents, buyTicket };

//  NOTES  
// this file only does db layer no express req res
// controller handles route and passes here
// controller uses getAllEvents for GET /api/events
// and buyTicket for POST /api/events/:id/purchase
// both services admin and client acces same shared-db/database.sqlite
// llm booking svc also reads same events table so all synced
// admin makes events, client buys them, llm talks to both