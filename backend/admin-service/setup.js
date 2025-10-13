/**
 * @file setup.js
 * @description Initializes database schema if not already created
 */

const sqlite3 = require("sqlite3").verbose();

//this is the function called from server.js to setup the database tables if they don't already exist
function initDatabase() {
  const db = new sqlite3.Database("../shared-db/database.sqlite");

  // Create Events, Tickets, and Transactions tables if they don't exist
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS Events (
      eventID INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT,
      end_time TEXT,
      address TEXT,
      num_tickets INTEGER,
      organizerID INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Tickets (
      ticketID INTEGER PRIMARY KEY AUTOINCREMENT,
      eventID INTEGER,
      buyerID INTEGER,
      seat_number TEXT,
      price REAL,
      status TEXT,
      purchase_time TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Transactions (
      transactionID INTEGER PRIMARY KEY AUTOINCREMENT,
      BuyerID INTEGER,
      ticketID INTEGER,
      amount REAL,
      payment_method TEXT,
      timestamp TEXT
    )`);
  });

  db.close();
}

module.exports = { initDatabase };