// backend/llm-booking-service/utils/intentParser.js
// ok this file = text → structured json translator
// takes a raw msg user typed or said and figures out what they meant
// like “book 2 tickets for jazz night” becomes {intent:"book", event:"jazz night", quantity:2}
// chatController calls this inside parseOnly and handleChat
// i keep this as standalone util so controller stays clean + no circular imports


export function parseIntent(message) {
  // normalize text first
  // lowercase it so pattern checks ignore case
  // trim spaces bc stray whitespace at start or end can break regex anchors
  const lower = (message || "").toLowerCase().trim()

  // guard for empty string or undefined
  // if no msg just return default unknown obj so controller can handle gracefully
  if (!lower) return { intent: "unknown", event: null, quantity: null }


  // SHOW EVENTS INTENT  
  // simple keyword check no regex needed
  // if both words “show” and “event” exist anywhere user prob wants list
  if (lower.includes("show") && lower.includes("event"))
    return { intent: "show", event: null, quantity: null }
  // aka “show me events” or “can u show event list” etc
  // dont overcomplicate bc we only care if those 2 words appear


  // BOOK INTENT  
  // ok now for the main one book phrase
  // we want to handle both numbers and words like “2” or “two”
  // also optional “ticket” word and we need to grab the event name at end
  // ex “book two tickets for jazz night” → qty=2 event=jazz night

  const bookRe = /book\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)?\s*(?:tickets?|ticket)?\s*for\s+(.+)$/i

  // regex breakdown 
  // book\s*  //literal 'book' then any spaces  
  // (\d+|one|two|...|ten)? optional group for number or word qty  
  // \s*        //spaces optional again  
  // (?:tickets?|ticket)?   optional word ticket or tickets (non capture)
  // \s*for\s+  //must have 'for' then one+ space  
  // (.+)$   //capture everything after as event name  
  // flag i = //ignore case (we lowercase anyway but safe)
  // aka matches “book 3 tickets for jazz night” “book one for blues” etc


  // now run regex on lower msg
  const m = lower.match(bookRe)

  // if regex matched means we found a booking phrase
  if (m) {
    // group1 = qty if user gave number or word
    // else default to “1” so we always have some number
    let qtyRaw = m[1] ? m[1].toLowerCase() : "1"

    // convert number words to digits
    // needed bc parseInt(“two”) gives NaN
    const wordToNum = {
      one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    }

    // figure out final qty
    // try map first (for word), else parseInt (for digits), else fallback 1
    const quantity = wordToNum[qtyRaw] || parseInt(qtyRaw, 10) || 1

    // group2 = event name
    // trim to remove trailing spaces or weird chars
    const ev = (m[2] || "").trim()

    // return structured json result
    // controller later uses these fields to decide next step
    // ex if user said “book two for jazz” controller reply “confirm 2 for jazz?”
    return { intent: "book", event: ev, quantity }
  }


  // CONFIRM INTENT  
  // user replying yes or confirming booking
  // regex ^yes = start must be yes, then anything, then “book” later
  // ensures user isn’t just saying yes randomly, must mention booking
  // ex “yes book jazz night” or “yes please book that one”
  if (/^yes\b.*\bbook\b/.test(lower))
    return { intent: "confirm", event: null, quantity: null }
  // controller will reuse stored event and qty context from earlier booking step


  // GREETING INTENT  
  // detect basic hi/hello/hey at start of msg
  // mostly for fun and UX but also helps greet before parsing fails
  if (/^(hi|hello|hey)\b/.test(lower))
    return { intent: "greet", event: null, quantity: null }
  // ex “hey "  = greet


  // FALLBACK  
  // if none of above matched then unknown
  // controller uses this to show help or example usage
  return { intent: "unknown", event: null, quantity: null }
}


// NOTES  
// chatController imports this and decides what to do next  
// parseOnly just returns parsed json (for debug/test)  
// handleChat adds logic like show events or confirm booking  
// so basically this fxn tells chatController what kind of msg it is
// aka intent classifier but with regex and simple parsing