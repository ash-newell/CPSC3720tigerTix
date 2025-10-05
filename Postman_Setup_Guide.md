# TigerTix API - Postman Setup Guide

## Prerequisites

1. **Start the TigerTix Server**
   - Open PowerShell/Terminal in your project directory
   - Run: `node TigerTix.js`
   - Verify you see: "TigerTix server running on http://localhost:3000"

2. **Install Postman**
   - Download from: https://www.postman.com/downloads/
   - Or use Postman web version

## Postman Collection Setup

### Step 1: Create a New Collection
1. Open Postman
2. Click "New" → "Collection"
3. Name it: "TigerTix API"
4. Add description: "Clemson TigerTix ticket management system"

### Step 2: Set Base URL Variable
1. In your collection, go to "Variables" tab
2. Add variable:
   - **Variable**: `baseUrl`
   - **Initial Value**: `http://localhost:3000`
   - **Current Value**: `http://localhost:3000`

## API Endpoints to Add

### 1. 📅 **Create Event** (POST)
- **Method**: POST
- **URL**: `{{baseUrl}}/events`
- **Headers**: 
  - `Content-Type`: `application/json`
- **Body** (raw JSON):
```json
{
  "title": "Football Game - Clemson vs Georgia",
  "description": "Death Valley showdown",
  "start_time": "2025-10-25 15:30:00",
  "end_time": "2025-10-25 18:30:00",
  "address": "Memorial Stadium",
  "num_tickets": 10,
  "organizerID": 1,
  "ticket_price": 75.00
}
```

### 2. 📋 **Get All Events** (GET)
- **Method**: GET
- **URL**: `{{baseUrl}}/events`
- **Headers**: None needed

### 3. 🎫 **Get Available Tickets for Event** (GET)
- **Method**: GET
- **URL**: `{{baseUrl}}/events/1/tickets`
- **Headers**: None needed
- **Note**: Replace `1` with actual event ID

### 4. 📊 **Check Event Availability** (GET)
- **Method**: GET
- **URL**: `{{baseUrl}}/events/1/availability`
- **Headers**: None needed

### 5. 💳 **Buy Specific Ticket** (POST)
- **Method**: POST
- **URL**: `{{baseUrl}}/tickets/1/buy`
- **Headers**: 
  - `Content-Type`: `application/json`
- **Body** (raw JSON):
```json
{
  "buyerID": 123,
  "payment_method": "credit_card"
}
```

### 6. 🎯 **Buy Any Available Ticket** (POST)
- **Method**: POST
- **URL**: `{{baseUrl}}/events/1/buy-ticket`
- **Headers**: 
  - `Content-Type`: `application/json`
- **Body** (raw JSON):
```json
{
  "buyerID": 456,
  "payment_method": "debit_card"
}
```

### 7. 👤 **Get User's Purchased Tickets** (GET)
- **Method**: GET
- **URL**: `{{baseUrl}}/users/123/tickets`
- **Headers**: None needed

### 8. ➕ **Create Individual Ticket** (POST)
- **Method**: POST
- **URL**: `{{baseUrl}}/tickets`
- **Headers**: 
  - `Content-Type`: `application/json`
- **Body** (raw JSON):
```json
{
  "eventID": 1,
  "seat_number": "VIP-001",
  "price": 150.00,
  "buyerID": null
}
```

## Step-by-Step Testing Workflow

### Phase 1: Setup Data
1. **Create an Event** - Use endpoint #1
   - This will automatically create tickets
   - Note the `eventID` from the response

2. **Verify Event Creation** - Use endpoint #2
   - Should see your new event in the list

### Phase 2: Browse Available Tickets
3. **Check Available Tickets** - Use endpoint #3
   - Replace event ID in URL with your event ID
   - Note the ticket IDs available

4. **Check Availability Stats** - Use endpoint #4
   - See total vs available tickets

### Phase 3: Purchase Tickets
5. **Buy a Specific Ticket** - Use endpoint #5
   - Use a ticket ID from step 3
   - Note the transaction ID returned

6. **Buy Any Available Ticket** - Use endpoint #6
   - System will auto-assign next available ticket
   - Use different buyer ID

### Phase 4: Verify Purchases
7. **Check User's Tickets** - Use endpoint #7
   - Use buyer ID from previous steps
   - Should see purchased ticket details

8. **Recheck Availability** - Use endpoint #4 again
   - Available count should have decreased

## Postman Environment Variables

Create these variables in your Postman environment for easier testing:

| Variable | Value | Description |
|----------|-------|-------------|
| `baseUrl` | `http://localhost:3000` | Server base URL |
| `eventID` | `1` | Current event ID for testing |
| `ticketID` | `1` | Current ticket ID for testing |
| `buyerID` | `123` | Test buyer ID |

## Quick Test Script

Here's a JavaScript test script you can add to any request in Postman (Tests tab):

```javascript
// Basic response validation
pm.test("Status code is successful", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});

pm.test("Response has required structure", function () {
    const responseJson = pm.response.json();
    pm.expect(responseJson).to.be.an('object');
});

// For purchase endpoints, save transaction info
if (pm.response.json().ticketID) {
    pm.environment.set("lastTicketID", pm.response.json().ticketID);
}

if (pm.response.json().eventID) {
    pm.environment.set("lastEventID", pm.response.json().eventID);
}
```

## Common Response Examples

### Successful Event Creation:
```json
{
  "message": "Event created successfully",
  "eventID": 2,
  "title": "Football Game - Clemson vs Georgia",
  "tickets_created": 10,
  "ticket_ids": [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
}
```

### Successful Ticket Purchase:
```json
{
  "message": "Ticket purchased successfully",
  "ticketID": 11,
  "transactionID": 3,
  "buyerID": 123,
  "seat_number": "SEAT-001",
  "price": 75,
  "purchase_time": "2025-10-05T01:30:00.000Z",
  "payment_method": "credit_card"
}
```

### Error Response (Ticket Already Sold):
```json
{
  "error": "Ticket not found or already sold"
}
```

## Troubleshooting

### Server Connection Issues:
- Ensure Node.js server is running: `node TigerTix.js`
- Check if port 3000 is available
- Verify no firewall blocking localhost:3000

### Database Issues:
- Ensure `tigertix.db` exists in project folder
- Check server console for database connection messages

### Request Issues:
- Verify Content-Type header for POST requests
- Check JSON syntax in request body
- Ensure required fields are provided

## Pro Tips

1. **Use Collection Runner**: Run all requests in sequence to test full workflow
2. **Export Collection**: Save your Postman collection for team sharing
3. **Use Pre-request Scripts**: Set up dynamic data (timestamps, random IDs)
4. **Monitor API**: Use Postman monitoring for ongoing API health checks

Happy testing! 🎫