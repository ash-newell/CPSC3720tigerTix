/**
 * @file adminRoutes.js
 * @description Defines routes for admin endpoints so they can be mounted in server.js
 */
const express = require("express");
const router = express.Router();
const { addEvent } = require("../controllers/adminController");

// Route to create events
router.post("/events", addEvent);

module.exports = router;