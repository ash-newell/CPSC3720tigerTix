// backend/llm-booking-service/controllers/chatController.js
// this controller handles the llm text convo logic layer
// it connects intentParser (for meaning) + bookingModel (for db ops)
// 2 exported fxns: parseOnly (just analyze msg) and handleChat (full logic flow)

// import db model fxns for event data access
// these talk directly to sqlite file in shared-db folder
import { getAllEvents, getEventByName, updateTickets } from "../models/bookingModel.js";

// import parser util that turns plain text into structured intent data
// parseIntent(msg) returns small json like { intent:"book", event:"jazz night", quantity:2 }
// note parser does not do db access, only pattern detection
import { parseIntent } from "../utils/intentParser.js";


// parseOnly endpoint

// this route is POST /api/llm/parse
// fxn simply parses text then return structured json
// used by llm test and voice transcription before actual booking
export const parseOnly = (req, res) => {
  // grab the msg string from req.body.message
  // fallback to req.body.text bc diff clients may use diff json key names
  // ex {"message":"book 2 tickets"} or {"text":"book 2 tickets"}
  const message = req.body.message || req.body.text;

  // basic guard if no msg key found
  // sends http status 400 (bad request) aka frontend knows missing field
  if (!message) return res.status(400).json({ error: "Message required" });

  // run parser on raw msg
  // parseIntent returns json object describing what user said
  // var parsed holds that json like { intent:"book", event:"jazz night", quantity:2 }
  const parsed = parseIntent(message);

  // if parser fails to match any known pattern it returns intent="unknown"
  // here check for that + reply 422 (unprocessable entity)
  // includes sample output so user/dev sees what expected shape looks like
  if (parsed.intent === "unknown") {
    return res.status(422).json({
      error: "Could not parse your request.",
      example: { intent: "book", event: "Blues Night", tickets: 2 },
    });
  }

  // IF success then just echo back parsed object
  // res.json auto stringifies + sets content-type header
  return res.json({
    intent: parsed.intent,
    event: parsed.event,
    tickets: parsed.quantity, // note renamed from parser.quantity to tickets for readability
  });
};


// handleChat endpoint

// this one used by POST /api/chat
// main convo engine of llm-service
export const handleChat = (req, res) => {

  // destruct msg from req.body
  // default {}prevents crash if body undefined
  const { message } = req.body || {};

  // same guard as parseOnly make sure we actually got msg input
  if (!message) return res.status(400).json({ error: "Message required" });

  // lower = lowercase version for regex + keyword matching
  // bc human input case varies so regex like /^hi/ easier when lowercase
  const lower = message.toLowerCase();

  // parseIntent converts free text into what it means structurally so it can look like:
  // ex "book 2 for jazz" → {intent:"book",event:"jazz",quantity:2}
  // ex "show events" → {intent:"show"}
  // ex "hello" {intent:"greet"}
  const parsed = parseIntent(message);



  // GREETING BRANCH

  //  check if user said hi/hello/hey
  // regex explanation
  // ^ → start of string anchor
  // (hi|hello|hey) → group matches any of those words
  // \b → word boundary ensures we don’t match to a word thats close but not greeting
  // so pattern matches "hi" or "hello there" but not "this"
  if (/^(hi|hello|hey)\b/.test(lower)) {
    // return greeting response as json
    // reply key used by frontend chat UI to display text
    return res.json({
      reply:
        "hello! im your tigertix assistant (guest). you can say 'show events' or 'book 2 tickets for jazz night'."
    });
  }



  // SHOW EVENTS BRANCH

  // triggered when parser.intent == "show"
  // user said something like "show events" or "show me events"
  if (parsed.intent === "show") {
    // call db model fxn getAllEvents
    // run SQL: SELECT title AS name, num_tickets AS total_tickets FROM Events
    // callback gives (err, rows)
    getAllEvents((err, rows) => {

      // handle any sqlite failure (ex bad path, db locked)
      if (err) return res.status(500).json({ reply: "database error." });

      // rows = array of events from db
      // map creates string list like "Jazz Night (25 left), Blues Bash (10 left)"
      // r.name and r.total_tickets come from db alias in bookingModel
      const list = rows.map(r => `${r.name} (${r.total_tickets} left)`).join(", ");

      // if no rows respond w no events found
      // else join list into single text for chat reply
      return res.json({
        reply: rows.length
          ? `here are the available events: ${list}`
          : "no events found."
      });
    });
    return; // stop function here else fallback below runs too
  }


  // BOOKING PROPOSAL BRANCH

  // triggered when parser.intent == "book"
  // user said “book 2 tickets for jazz night”
  // here do NOT yet change db, only confirm intent + ask to verify
  if (parsed.intent === "book") {
    return res.json({
      // builds dynamic response using parser data
      // ${parsed.quantity || 1} ensures default qty if undefined
      reply: `i can book ${parsed.quantity || 1} ticket(s) for ${parsed.event}. please confirm by saying "yes book ${parsed.event}".`,
      // pendingBooking returned so frontend could display confirm prompt
      pendingBooking: parsed
    });
  }



  // CONFIRM BOOKING BRANCH

  // user now said something like “yes book jazz night”
  // parser.intent == "confirm"
  if (parsed.intent === "confirm") {

    // regex here extracts whatever follows word “book”
    // .match returns array, [1] is captured text (event name)
    // fallback "clemson" = dummy so code not break on undefined
    const eventHint = (lower.match(/book\s+(.*)$/) || [])[1] || "clemson";

    // qty fallback 1 if parser didn’t store earlier quantity
    const qty = parsed.quantity || 1;

    // 1) look up event by name fragment
    // db fxn runs SELECT ... WHERE LOWER(title) LIKE LOWER(%eventHint%)
    // allows fuzzy search like "jazz" -> "Jazz Night"
    getEventByName(eventHint, (err, row) => {

      // handle sqlite errors
      if (err) return res.status(500).json({ reply: "database error." });

      // if no event or not enough tickets left, reply sold out
      // protects against oversell
      if (!row || row.total_tickets < qty) {
        return res.status(400).json({
          reply: "sorry, that event is sold out or doesn’t have enough tickets."
        });
      }

      // 2) update tickets count
      // db fxn updateTickets runs UPDATE Events SET num_tickets = num_tickets - ?
      // reduces available count atomically
      updateTickets(row.id, qty, (uErr) => {

        // if update failed (db busy, constraint etc) reply error
        if (uErr) {
          return res.status(400).json({ reply: "could not complete booking." });
        }

        // success path
        // sends json message confirming event + qty
        return res.json({
          reply: `booking confirmed! ${qty} ticket(s) booked for ${eventHint}.`
        });
      });
    });
    return; // stop so fallback not run
  }



  // UNKNOWN FALLBACK

  // reached if parser.intent not any of the above
  // gives generic help msg
  return res.json({
    reply: "sorry, i didn’t understand. try 'show events' or 'book 2 tickets for jazz night'."
  });
};