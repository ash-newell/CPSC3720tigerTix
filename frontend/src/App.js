// App.js
// React frontend for TigerTix: the client-facing interface of the system.
// This React component connects to the Client Microservice(port 6001),
// which provides event data and handles ticket purchases.
// The Admin Microservice (port 5001) is used only for event creation and
// management — the frontend never interacts with it directly.
//
// Architecture overview:
//   Admin Service (5001): creates/updates events, populates database
//   Client Service (6001): serves event listings & ticket purchases
//   Frontend (3000): displays events and provides accessible purchase UI
//
// The React app retrieves event data via REST API calls to
//   http://localhost:6001/api/events
// and sends POST requests to purchase tickets.

//import useEffect and useState for react
//import app.css for local styling
import React, { useEffect, useState } from "react";
import "./App.css";

function App() {

  // STATE VARIABLES

  // events holds the array of events retrieved from the backend
  const [events, setEvents] = useState([]);
  // loading indicates whether data is still being fetched from the API
  const [loading, setLoading] = useState(true);
  // 'message' displays purchase or error feedback to the user
  const [message, setMessage] = useState("");

  // Define the base URL for the backend API.
  // This points to the Client Microservice on port 6001.
  const BASE_URL = "http://localhost:6001/api/events";


  // FETCH EVENTS FROM BACKEND

  /* This useEffect() block automatically retrieves event data from the
  backend Client Microservice (running on port 6001) as soon as the react component first loads,
  replacing any hardcoded data with live data stored in the shared SQLite database.
  This ensures that users see the most up-to-date event information.
  useEffect runs only once after the initial render because of the
  empty dependency array [].
  The fetch() function is a browser API that sends an HTTP GET request
  to the URL defined in BASE_URL
  */
  useEffect(() => {
    fetch(BASE_URL)
    //Once the server responds, .then((res) => res.json()) converts the
   //response body from raw JSON text into a usable JavaScript object.

      .then((res) => res.json()) // Parse the JSON response body
      .then((data) => {
        // Calls setEvents(data), updates the React state variable
        // "events" so that the frontend can re-render and display the retrieved events on screen.
        setEvents(data);
        // Indicate that loading is complete
        setLoading(false);
      })
      .catch((err) => {
        // Log the error if the fetch fails 
        console.error("Error fetching events:", err);
        setLoading(false);
      });
  }, []); // Empty dependency array ensures this runs only once




  // HANDLE TICKET PURCHASE

  // Sends a POST request to the backend to simulate purchasing a ticket.
  // Takes the event ID as an argument.
  const handlePurchase = async (eventID) => {
    // Clear any existing messages before starting a new purchase
    setMessage("");

    try {
      // Construct the URL for the "buy ticket" endpoint, basically builds a POST request
      const response = await fetch(`${BASE_URL}/${eventID}/buy-ticket`, {
        method: "POST", // Use POST because this action modifies data
        headers: { "Content-Type": "application/json" }, // Inform server we’re sending JSON
        body: JSON.stringify({ buyerID: 1 }) // Example buyer ID (could be dynamic later)
      });

      // If the purchase is successful (HTTP 200 OK or 201 Created) update UI
      if (response.ok) {
        setMessage("Ticket purchased successfully.");

        // After buying, retrieve updated event data from backend
        // so the UI reflects the reduced ticket count.
        const refreshed = await fetch(BASE_URL).then((r) => r.json());
        setEvents(refreshed);
      } 
      // If the server returns an error response (e.g., 404 or 500)
      else {
        setMessage("Purchase failed. Please try again.");
      }
    } catch (err) {
      // Catch any network or runtime errors ( backend not running)
      console.error("Network error while purchasing:", err);
      setMessage("Unable to complete purchase — server not reachable.");
    }
  };


  // RENDER LOGIC

  // While event data is still loading, display a temporary message so that the UI
  // doesn't appear blank or broken.
  if (loading) {
    return <p>Loading event data...</p>;
  }

  // Main JSX (React HTML syntax)
  // This section handles both layout and accessibility considerations

  //returns a main wrapper 
  return (
    <main className="App">
      {/* APP Title */}
      <h1 id="page-title">TigerTix Events</h1>

      {/* 
        Accessible alert region that announces changes to assistive technologies.
        aria-live="polite" tells screen readers to announce changes
        without interrupting the user mid-sentence
      */}
      {message && (
        <div role="alert" aria-live="polite" className="status-message">
          {message}
        </div>
      )}

      {/* 
        List of events retrieved from the backend.
        Each event displays title, date, available tickets, and a Buy button.
        aria-label helps screen readers describe the purpose of the list

      */}
      <ul aria-label="List of available events">
        {events.length === 0 ? (
          <p>No events available at this time.</p>
        ) : (
          events.map((event) => (
            <li key={event.eventID} className="event-card">
              {/* Event title */}
              <h2>{event.title}</h2>

              {/* Event details */}
              <p>Date: {event.start_time || "To be announced"}</p>
              <p>Tickets Available: {event.num_tickets}</p>

              {/* 
                Purchase button: 
                Calls handlePurchase() when clicked, passing the event ID.
                aria-label provides a full description for users with screen readers.
              */}
              <button
                onClick={() => handlePurchase(event.eventID)}
                aria-label={`Buy ticket for ${event.title}`}
              >
                Buy Ticket
              </button>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
// exports the App component as the default so that it is the entry point when imported
export default App;