/**
 * @file setup.js
 * @description Initializes database schema if not already created
 */

import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const { verbose } = sqlite3;
const dbLib = verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = path.resolve(__dirname, "../../shared-db/database.sqlite");


//this is the function called from server.js to setup the database tables if they don't already exist
export function initDatabase() {
    // When running tests, skip creating on-disk sqlite DB; tests use in-memory mock
    if (process.env.NODE_ENV === 'test') {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const db = new dbLib.Database(dbPath, (err) => {
            if (err) return reject(err);

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

            db.close((closeErr) => {
                if (closeErr) return reject(closeErr);
                resolve();
            });
        });
    });
}

