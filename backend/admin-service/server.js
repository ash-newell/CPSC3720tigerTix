/**
 * @file server.js (Admin Service)
 * @description entry point for Admin Microservice
 * Handles event creation and database initialization.
 */

//dependencies express for server, cors for cross-origin requests
const express = require("express");
const cors = require("cors");
const adminRoutes = require("./routes/adminRoutes");
//import initDatabase function to setup db tables if they don't exist
const { initDatabase } = require("./setup");

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// Initialize DB tables if needed
initDatabase();

// Mount routes because all admin routes start with /api/admin 
//ex http://localhost:5001/api/admin/events vs http://localhost:5001/api/events
app.use("/api/admin", adminRoutes);


// Start the server listening on PORT 5001
app.listen(PORT, () => {
  console.log(`Admin Service running on http://localhost:${PORT}`);
});