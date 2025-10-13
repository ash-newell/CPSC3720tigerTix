/**
 * @file clientController.js
 * @description Business logic for event display and ticket purchase
 */

//import getAllEvents and buyTicket functions from clientModel.js
const { getAllEvents, buyTicket } = require("../models/clientModel");

/**
 * GET /api/events
 * Returns a list of events.
 */
//this is the function that responds to GET /api/events requests. The function will inject the req and res objects
function listEvents(req, res) {
  getAllEvents((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    //sends resulting rows array as a JSON
    res.json(rows);
  });
}

/**
 * POST /api/events/:id/purchase
 * Buys a ticket for the specified event
 */

//this is the function that responds to POST /api/events/:id/buy-ticket requests. 
function purchaseTicket(req, res) {
    //extract eventID from URL (request expects an event identifier) and buyerID from request body (or default to 1)
  const eventID = req.params.id;
  //extract buyerID from request body or default to 1 if not provided (this is placeholder logic for now)
  const buyerID = req.body.buyerID || 1;
//call buyTicket from model with eventID and buyerID
  buyTicket(eventID, buyerID, (err, result) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json({
      message: "Ticket purchased successfully",
      ...result,
    });
  });
}
//makes the listEvents and purchaseTicket functions available to other files so
// when another file does a require("../controllers/clientController") it gets
//object with listEvents and purchaseTicket functions and so router can attach to HTTP endpoints
module.exports = { listEvents, purchaseTicket };