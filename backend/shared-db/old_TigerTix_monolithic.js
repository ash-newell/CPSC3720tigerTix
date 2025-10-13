const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3001;
// use cors to allow cross-origin requests from frontend
const cors = require("cors");
app.use(cors());
app.use(express.json());

// Connect to SQLite DB
const db = new sqlite3.Database('./tigertix.db', (err) => {
  if (err) console.error('Database error:', err.message);
  else console.log('Connected to SQLite database.');
});

app.get('/events', (req, res) => {
  db.all('SELECT * FROM Events', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST endpoint to create a new event and generate tickets
app.post('/events', (req, res) => {
  const { title, description, start_time, end_time, address, num_tickets, organizerID, ticket_price = 50.00 } = req.body;
  
  // Validate required fields
  if (!title || !num_tickets || num_tickets <= 0) {
    return res.status(400).json({ error: 'Title and num_tickets (> 0) are required' });
  }

  // Insert the event
  const eventQuery = `INSERT INTO Events (title, description, start_time, end_time, address, num_tickets, organizerID) 
                      VALUES (?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(eventQuery, [title, description, start_time, end_time, address, num_tickets, organizerID], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to create event: ' + err.message });
    }
    
    const eventID = this.lastID;
    
    // Create tickets for the event
    const ticketQuery = `INSERT INTO Tickets (eventID, seat_number, price, status) VALUES (?, ?, ?, 'available')`;
    const ticketPromises = [];
    
    for (let i = 1; i <= num_tickets; i++) {
      ticketPromises.push(
        new Promise((resolve, reject) => {
          const seatNumber = `SEAT-${String(i).padStart(3, '0')}`; // Generate seat numbers like SEAT-001, SEAT-002, etc.
          db.run(ticketQuery, [eventID, seatNumber, ticket_price], function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
          });
        })
      );
    }
    
    // Wait for all tickets to be created
    Promise.all(ticketPromises)
      .then(ticketIDs => {
        res.status(201).json({
          message: 'Event created successfully',
          eventID: eventID,
          title: title,
          tickets_created: num_tickets,
          ticket_ids: ticketIDs
        });
      })
      .catch(ticketErr => {
        // If ticket creation fails, we might want to rollback the event creation
        // For now, we'll just return an error but keep the event
        res.status(500).json({
          error: 'Event created but failed to create some tickets: ' + ticketErr.message,
          eventID: eventID
        });
      });
  });
});

app.post('/tickets', (req, res) => {
  const { eventID, seat_number, price, buyerID = null } = req.body;
  const query = `INSERT INTO Tickets (eventID, buyerID, seat_number, price, status) VALUES (?, ?, ?, ?, 'available')`;
  db.run(query, [eventID, buyerID, seat_number, price], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ticketID: this.lastID });
  });
});

app.get('/events/:id/availability', (req, res) => {
  const eventId = req.params.id;
  db.get(`SELECT num_tickets FROM Events WHERE eventID = ?`, [eventId], (err, event) => {
    if (err || !event) return res.status(404).json({ error: 'Event not found' });

    db.get(`SELECT COUNT(*) AS sold FROM Tickets WHERE eventID = ? AND status = 'sold'`, [eventId], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      const available = event.num_tickets - result.sold;
      res.json({ 
        eventID: eventId,
        total_tickets: event.num_tickets,
        sold_tickets: result.sold,
        available_tickets: available 
      });
    });
  });
});

// GET available tickets for an event
app.get('/events/:id/tickets', (req, res) => {
  const eventId = req.params.id;
  db.all(`SELECT ticketID, seat_number, price, status FROM Tickets WHERE eventID = ? AND status = 'available' ORDER BY seat_number`, [eventId], (err, tickets) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      eventID: eventId,
      available_tickets: tickets
    });
  });
});

// POST buy a specific ticket by ticketID
app.post('/tickets/:id/buy', (req, res) => {
  const ticketID = req.params.id;
  const { buyerID, payment_method = 'credit_card' } = req.body;
  
  // Validate required fields
  if (!buyerID) {
    return res.status(400).json({ error: 'buyerID is required' });
  }

  // Start a transaction to ensure data consistency
  db.serialize(() => {
    // First, check if the ticket exists and is available
    db.get(`SELECT * FROM Tickets WHERE ticketID = ? AND status = 'available'`, [ticketID], (err, ticket) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!ticket) return res.status(404).json({ error: 'Ticket not found or already sold' });

      const purchase_time = new Date().toISOString();
      
      // Update ticket status and assign buyer
      db.run(`UPDATE Tickets SET buyerID = ?, status = 'sold', purchase_time = ? WHERE ticketID = ?`, 
        [buyerID, purchase_time, ticketID], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to update ticket: ' + err.message });

        // Create transaction record
        db.run(`INSERT INTO Transactions (BuyerID, ticketID, amount, payment_method, timestamp) VALUES (?, ?, ?, ?, ?)`,
          [buyerID, ticketID, ticket.price, payment_method, purchase_time], function (err) {
          if (err) {
            // Rollback ticket update if transaction creation fails
            db.run(`UPDATE Tickets SET buyerID = NULL, status = 'available', purchase_time = NULL WHERE ticketID = ?`, [ticketID]);
            return res.status(500).json({ error: 'Failed to create transaction record: ' + err.message });
          }

          res.status(200).json({
            message: 'Ticket purchased successfully',
            ticketID: ticketID,
            transactionID: this.lastID,
            buyerID: buyerID,
            seat_number: ticket.seat_number,
            price: ticket.price,
            purchase_time: purchase_time,
            payment_method: payment_method
          });
        });
      });
    });
  });
});

// POST buy any available ticket for an event
app.post('/events/:id/buy-ticket', (req, res) => {
  const eventID = req.params.id;
  const { buyerID, payment_method = 'credit_card' } = req.body;
  
  // Validate required fields
  if (!buyerID) {
    return res.status(400).json({ error: 'buyerID is required' });
  }

  // Start a transaction to ensure data consistency
  db.serialize(() => {
    // Find the first available ticket for this event
    db.get(`SELECT * FROM Tickets WHERE eventID = ? AND status = 'available' ORDER BY seat_number LIMIT 1`, [eventID], (err, ticket) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!ticket) return res.status(404).json({ error: 'No available tickets for this event' });

      const purchase_time = new Date().toISOString();
      
      // Update ticket status and assign buyer
      db.run(`UPDATE Tickets SET buyerID = ?, status = 'sold', purchase_time = ? WHERE ticketID = ?`, 
        [buyerID, purchase_time, ticket.ticketID], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to update ticket: ' + err.message });
      //Decrease available ticket count in the Events table    
        db.run(`UPDATE Events SET num_tickets = num_tickets - 1 WHERE eventID = ? AND num_tickets > 0`,
      [eventID],
      (updateErr) => {
        if (updateErr) console.error('Failed to update event ticket count:', updateErr.message);
    }
  );
        // Create transaction record
        db.run(`INSERT INTO Transactions (BuyerID, ticketID, amount, payment_method, timestamp) VALUES (?, ?, ?, ?, ?)`,
          [buyerID, ticket.ticketID, ticket.price, payment_method, purchase_time], function (err) {
          if (err) {
            // Rollback ticket update if transaction creation fails
            db.run(`UPDATE Tickets SET buyerID = NULL, status = 'available', purchase_time = NULL WHERE ticketID = ?`, [ticket.ticketID]);
            return res.status(500).json({ error: 'Failed to create transaction record: ' + err.message });
          }

          res.status(200).json({
            message: 'Ticket purchased successfully',
            ticketID: ticket.ticketID,
            transactionID: this.lastID,
            buyerID: buyerID,
            eventID: eventID,
            seat_number: ticket.seat_number,
            price: ticket.price,
            purchase_time: purchase_time,
            payment_method: payment_method
          });
        });
      });
    });
  });
});

// GET user's purchased tickets
app.get('/users/:id/tickets', (req, res) => {
  const userID = req.params.id;
  const query = `
    SELECT t.ticketID, t.eventID, t.seat_number, t.price, t.purchase_time, 
           e.title as event_title, e.start_time, e.end_time, e.address
    FROM Tickets t
    JOIN Events e ON t.eventID = e.eventID
    WHERE t.buyerID = ? AND t.status = 'sold'
    ORDER BY e.start_time DESC
  `;
  
  db.all(query, [userID], (err, tickets) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      userID: userID,
      purchased_tickets: tickets
    });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`TigerTix server running on http://localhost:${PORT}`);
});

//SQL to reset the transactions and tickets tables
// sqlite3 tigertix.db
// UPDATE Tickets SET status='available', buyerID=NULL, purchase_time=NULL;
// DELETE FROM Transactions;
// .exit