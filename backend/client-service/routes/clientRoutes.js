/**
 * @file clientRoutes.js
 * @description Defines client routes for viewing and purchasing tickets.
 */
const express = require("express");
const router = express.Router();
const { listEvents, purchaseTicket } = require("../controllers/clientController");

router.get("/events", listEvents);
router.post("/events/:id/buy-ticket", purchaseTicket);

module.exports = router;