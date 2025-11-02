// backend/client-service/controllers/clientController.js
// this file is the controller layer for client svc
// connects express routes to db logic in clientModel.js
// so fxns here get req and res from express, then call db fxns and send back json
// basically this is middle man between frontend and sqlite


import { getAllEvents, buyTicket } from "../models/clientModel.js"  
// import model fxns so controller can just call instead of writing sql here


// LIST EVENTS  
// fxn handles GET /api/events
// so when user or frontend hits that url, this runs
export function listEvents(req, res) {
  // call model fxn getAllEvents
  // pass callback that gets err or rows
  getAllEvents((err, rows) => {
    // if db throws err, return 500 = server error
    if (err) return res.status(500).json({ error: err.message })

    // else send rows back as json
    res.json(rows)
    // rows is an array of event objs from db
    // ex [{id:1, title:'Jazz Night', num_tickets:10}, ...]
    // frontend will map this list into cards or table
  })
}


// PURCHASE TICKET  
// fxn handles POST /api/events/:id/purchase
// triggered when user clicks buy btn on frontend
export function purchaseTicket(req, res) {
  // get event id from url param
  // ex /api/events/1/purchase → id=1
  const eventID = req.params.id

  // buyer id comes from req body or default 1 for guest
  const buyerID = req.body.buyerID || 1

  // call model fxn buyTicket(eventID, buyerID)
  // this one actually updates db and returns result
  buyTicket(eventID, buyerID, (err, result) => {
    // HANDLE ERR CASE  
    // if something broke (no tickets, db locked, etc)
    if (err) {
      // make sure every error returns same shape for test consistency
      const status = err.status || 400
      const message = err.message || "purchase failed"
      return res.status(status).json({ message })
    }

    // HANDLE SUCCESS CASE  
    // result comes back with ticket id, seat, msg, etc
    // optional chaining bc result might be undefined
    const message =
      result?.message ||  // if model gave custom msg use it
      (result ? "purchase successful" : "sold out")  // fallback

    // send response to frontend
    // spread ...result to include all props like seat_number etc
    return res.status(200).json({
      message,
      ...result,
    })
  })
}


//NOTES  
// controller sits between routes model
// routes hit this file fxn here calls db model → sends json back
// listEvents used in clientRoutes.js for GET /api/events
// purchaseTicket used for POST /api/events/:id/purchase
// llm booking svc also indirectly touches same db when confirming bookings
// so all three svc (admin, client, llm) stay in sync on ticket counts