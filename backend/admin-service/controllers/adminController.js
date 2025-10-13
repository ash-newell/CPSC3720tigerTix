/**
 * @file adminController.js
 * @description Business logic for event creation
 * 
 */

/*
imports createEvent from adminModel.js so every time there are insertions to database and ticket gen. this goes through
model function and contorller never actually touches the database directly
*/
const { createEvent } = require("../models/adminModel");

/**
 * POST /api/admin/events
 * Creates a new event and generates tickets.
 * @param {Object} req - Express request object containing event details in req.body
 * @param {Object} res - Express response object used to send back the result
 * Validates input, calls createEvent from adminModel, and handles success/error responses.
 * Returns 201 with eventID and tickets_created on success, or appropriate error codes/messages on failure.
 * 
 */

/*
addEvent is the controller function that handles the POST request to create a new event and express will inject
the req and res objects when this function is called
*/
function addEvent(req, res) {
  const { title, num_tickets } = req.body;
  //basic validation that title and num_tickets are provided and num_tickets is a positive integer
  if (!title || !num_tickets || num_tickets <= 0)
    return res.status(400).json({ error: "Title and num_tickets (> 0) are required." });

/*  this passes the entire req.body object to the model function  which contains all the event details
    this controller expects the model to handle raw request fields and invoke callback after
*/
  createEvent(req.body, (err, result) => {
    //handle db errors by retuning 500 status with generic error message 
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      message: "Event created successfully",
      eventID: result.eventID,
      tickets_created: result.tickets_created,
    });
  });
}
//makes the addEvent function available to other files so when another file does a require("../controllers/adminController")
//it can access the addEvent function from the import object
module.exports = { addEvent };