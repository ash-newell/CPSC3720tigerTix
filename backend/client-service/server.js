/**
 * @file server.js (Client Service)
 * @description Handles viewing events and buying tickets
 */
const express = require("express");
const cors = require("cors");
const clientRoutes = require("./routes/clientRoutes");

// Create Express app and define PORT 6001
const app = express();
const PORT = 6001;

// cors is needed to allow cross-origin requests
app.use(cors());
app.use(express.json());
app.use("/api", clientRoutes);

app.listen(PORT, () => {
  console.log(`Client Service running on http://localhost:${PORT}`);
});