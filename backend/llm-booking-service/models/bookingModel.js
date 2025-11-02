// backend/llm-booking-service/models/bookingModel.js
// this file = db layer for llm booking svc
// this is where we actually talk to sqlite db
// chatController imports these fxns when user says things like show events or book tickets
// admin and client svc also use same shared db so every service stays synced


import sqlite3 from "sqlite3"   // sqlite engine running local
import { fileURLToPath } from "url"  // esm fix to get path to current file
import path from "path"              // builds paths safely
import fs from "fs"                  // lets us check if db exists before connecting


// GET DIRNAME SETUP  

// esm doesnt have __dirname var like cjs does
// fileURLToPath(import.meta.url) gives absolute path of this file
// path.dirname cuts off filename so we keep just folder path
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


// SET DB PATH  
// build full absolute path to shared database file
// using path.join so that slashes and spaces work on any op system
// .. goes up 2 levels from models folder to shared-db folder
const dbPath = path.join(__dirname, "..", "..", "shared-db", "database.sqlite")


// CHECK IF DB EXISTS  
// fs.existsSync returns true/false
// important bc sqlite will auto-create empty db if not found 
// so log error instead if missing
if (!fs.existsSync(dbPath)) {
  console.error(" database file not found at:", dbPath)
} else {
  console.log(" database found at:", dbPath)
}


// OPEN CONNECTION  
// sqlite3.Database opens connection to db file
// async open but safe to keep global connection var for service lifetime
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("failed to open database:", err.message)
  else console.log("connected to sqlite database")
})
// now db var can run db.all() db.get() db.run()
// it stays open while app runs, sqlite is fine handling multiple calls from one thread


// GET ALL EVENTS  
// used when user says "show events"
// controller calls this and passes a callback(err, rows)
export function getAllEvents(callback) {
  // db.all = run SQL expecting multiple rows
  // alias title→name, num_tickets→total_tickets for cleaner field names
  db.all("SELECT title AS name, num_tickets AS total_tickets FROM EVENTS", callback)
  // aka grab all events from table so chat can list like "Jazz Night (12 left)"
  // alias helps keep frontend and llm naming consistent
}


// GET EVENT BY NAME  

// used when user confirms booking aka "yes book jazz"
// searches for event by partial name (fuzzy match)
export function getEventByName(eventName, callback) {
  // db.get = one single row
  // LOWER(title) LIKE LOWER(?) makes search case-insensitive
  // % wraps search term so partial match allowed
  // ? placeholders = safe var binding ( sql injection)
  db.get(
    "SELECT eventID AS id, num_tickets AS total_tickets FROM EVENTS WHERE LOWER(title) LIKE LOWER(?)",
    [`%${eventName}%`],
    callback
  )
  // find any event where title contains what user said, ignoring case
  // ex eventName = "jazz" matches "Jazz Night"
  // so that controller knows which event how many tickets left
}


// UPDATE TICKETS  

// used once booking confirmed
// subtracts purchased tickets from that event
export function updateTickets(eventId, qty, callback) {
  // db.run = execute SQL write (no rows returned)
  // does math directly in SQL for atomic update
  db.run(
    "UPDATE EVENTS SET num_tickets = num_tickets - ? WHERE eventID = ?",
    [qty, eventId],
    callback
  )
  // basically reduce ticket count for event by qty
  // so that the db now shows updated remaining tickets
  // ex before=10 qty=2 now=8
  // callback tells controller if success or fail
}


// INTEGRATION NOTES  
// this file only touches database layer
// chatController uses it inside if-branches for diff intents:
// if intent=show then getAllEvents()
// if intent=confirm THEN getEventByName() then updateTickets()
//  keeps separation clean model only handles db logic
// admin , client , llm all talk to same db file (shared-db/database.sqlite)
// basically parser figures out what user said, controller decides what to do, model actually makes db change happen