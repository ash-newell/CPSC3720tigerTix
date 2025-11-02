// backend/client-service/models/clientModel.js
// this file fis for db model layer for client svc
// handles reading events and updating tickets in sqlite db
// controller calls these fxns when user or frontend hits endpoints like get /events or post /purchase
// admin svc also uses same shared db so everything stays synced between services

import path from "path"       // used to build abs path for db
import sqlite3 from "sqlite3" // local sqlite engine runs inside node process
const { verbose } = sqlite3   // gives us extra debug info
const dbLib = verbose()       // wraps sqlite with verbose mode

// SETUP DIRNAME  
// esm (import/export) dont give __dirname like cjs does
// so makes one manually using url and path mods
import { fileURLToPath } from "url"
import { dirname } from "path"
const __filename = fileURLToPath(import.meta.url)   // gives full path to this file
const __dirname = dirname(__filename)               // strip filename keep folder path

// SETUP DB PATH  
// path.resolve builds abs path safely so folder names with spaces work
// ../../shared-db jumps up 2 dirs to backend then into shared-db
// this way both client and admin svc acces same sqlite file
const dbPath = path.resolve(__dirname, "../../shared-db/database.sqlite")
console.log("connecting to sqlite db at:", dbPath)

// OPEN DB CONNECTION  
// dbLib.Database = connect to db file
// OPEN_READWRITE flag means no schema creation just read/write existing file
// callback logs if connection ok
const db = new dbLib.Database(dbPath, dbLib.OPEN_READWRITE, (err) => {
  if (err) console.error("sqlite connection error:", err.message)
  else console.log("connected to shared sqlite database.")
})

// HANDLE CONCURRENT ACCESS  
// configure busyTimeout so sqlite waits if db locked by another transaction
// prevents race cond when 2 people try buy ticket same time
db.configure("busyTimeout", 2000)


// GET ALL EVENTS  
// used by listEvents in clientController
// returns every event row from Events table
// let frontend show list of all active events
export function getAllEvents(callback) {
  // db.all runs SQL expecting multiple rows
  // [] = no params needed
  // callback returns (err, rows)
  db.all("SELECT * FROM Events", [], callback)
  // aka fetch everything from Events table and pass back to controller
  // controller then res.json(rows) so frontend can render events
}


// BUY TICKET  
// main fxn that handles when user buys ticket
// called by purchaseTicket in controller
// runs all db steps one by one aka serialize it so no two happen same time
export function buyTicket(eventID, buyerID, callback) {
  db.serialize(() => {
  // START TRANSACTION  
  // begin makes all next db actions atomic = happen together or not at all
  // aka if one step fail (like update ticket) everything rolls back so you never end up with half a ticket sold or weird data
    db.run("BEGIN TRANSACTION", (beginErr) => {
      if (beginErr) {
        // handle sqlite busy or locked error (two buyers at once)
        if (beginErr.code === "SQLITE_BUSY" || beginErr.code === "SQLITE_LOCKED") {
          const busyErr = new Error("sold out")
          busyErr.status = 400
          return callback(busyErr)
        }
        // else generic error
        return callback(beginErr)
      }

      // SELECT AVAILABLE TICKET  
      // find first unsold ticket for this event
      // order by seat_number so seats assigned in order SEAT-001 then SEAT-002 etc
      // limit 1 = only need one ticket
      db.get(
        "SELECT * FROM Tickets WHERE eventID = ? AND status = 'available' ORDER BY seat_number LIMIT 1",
        [eventID],
        (err, ticket) => {
          if (err) {
            db.run("ROLLBACK") // undo if read fail
            return callback(err)
          }

          // SOLD OUT CASE  
          // if no ticket found means all sold
          if (!ticket) {
            db.run("COMMIT")  // finalize anyway nothing changed
            const soldOutErr = new Error("sold out")
            soldOutErr.status = 400
            return callback(soldOutErr)
          }

          // PURCHASE TIME  
          // make timestamp in ISO format look like: 2025-11-01T19:42:33.000Z
          // built-in js date fxn .toISOString() make universal time string
          // saved in db so know exactly when ticket was bought
          // aka audit trail or order history
          const purchase_time = new Date().toISOString()

          // UPDATE TICKET  
          // mark that ticket as sold
          // record buyerID and purchase_time in row
          db.run(
            "UPDATE Tickets SET buyerID = ?, status = 'sold', purchase_time = ? WHERE ticketID = ?",
            [buyerID, purchase_time, ticket.ticketID],
            (updateErr) => {
              if (updateErr) {
                db.run("ROLLBACK")
                return callback(updateErr)
              }

              // UPDATE EVENT COUNT  
              // decrement num_tickets field in Events table so UI shows updated remaining
              db.run(
                "UPDATE Events SET num_tickets = num_tickets - 1 WHERE eventID = ?",
                [eventID],
                (updateEventErr) => {
                  if (updateEventErr) {
                    db.run("ROLLBACK")
                    return callback(updateEventErr)
                  }

                  // COMMIT FINAL  
                  // all good so finalize write
                  db.run("COMMIT")

                  // RETURN SUCCESS OBJECT  
                  // give controller ticket id seat num and msg
                  callback(null, {
                    ticketID: ticket.ticketID,
                    seat_number: ticket.seat_number,
                    message: "purchase successful",
                  })
                }
              )
            }
          )
        }
      )
    })
  })
}


//  NOTES  
// this file only does db layer no express req res
// controller handles route and passes here
// controller uses getAllEvents for GET /api/events
// and buyTicket for POST /api/events/:id/purchase
// both services admin and client acces same shared-db/database.sqlite
// llm booking svc also reads same events table so all synced
// admin makes events, client buys them, llm talks to both