// App.js
// React frontend for TigerTix: the client-facing interface of the system.
import React, { useEffect, useState } from "react";
import "./App.css";

function App() {
  // STATE: events + loading + purchase message (existing behavior)
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Chat/voice state
  const [messages, setMessages] = useState([]); // {role: 'user'|'assistant', text}
  const [isRecording, setIsRecording] = useState(false);

  // Backend URLs
  const BASE_URL = "http://localhost:6001/api/events"; // client service
  // LLM booking service - adjust port if your llm service runs elsewhere
  const LLM_URL = "http://localhost:7001/api/chat";

  // Fetch events (unchanged)
  useEffect(() => {
    fetch(BASE_URL)
      .then((res) => res.json())
      .then((data) => {
        setEvents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching events:", err);
        setLoading(false);
      });
  }, []);

  // Purchase handler (unchanged behavior)
  const handlePurchase = async (eventID) => {
    setMessage("");
    try {
      const response = await fetch(`${BASE_URL}/${eventID}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerID: 1 }),
      });

      if (response.ok) {
        setMessage("Ticket purchased successfully.");
        const refreshed = await fetch(BASE_URL).then((r) => r.json());
        setEvents(refreshed);
      } else {
        setMessage("Purchase failed. Please try again.");
      }
    } catch (err) {
      console.error("Network error while purchasing:", err);
      setMessage("Unable to complete purchase — server not reachable.");
    }
  };

  // UTILS: text-to-speech (SpeechSynthesis)
  const speak = (text) => {
    if (!window.speechSynthesis) return; // not supported
    const utter = new SpeechSynthesisUtterance(text);
    // Accessibility: slow down slightly for clarity
    utter.rate = 0.95;
    utter.pitch = 1.0;
    // Choose a clear voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length) {
      const en = voices.find((v) => /en(-|_)?/i.test(v.lang)) || voices[0];
      if (en) utter.voice = en;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  // Send message text to LLM booking service and handle reply
  const sendMessageToLLM = async (text) => {
    // Append user message locally
    setMessages((m) => [...m, { role: "user", text }] );

    try {
      const res = await fetch(LLM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const reply = data.reply || "(no reply)";
      // Append assistant reply to chat
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
      // Speak the reply aloud
      speak(reply);
    } catch (err) {
      console.error("LLM request failed:", err);
      const errMsg = "Unable to reach LLM service.";
      setMessages((m) => [...m, { role: "assistant", text: errMsg }]);
      speak(errMsg);
    }
  };

  // Play a short beep (WebAudio) before starting recording
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 1000;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
      setTimeout(() => {
        o.stop();
        if (ctx.close) ctx.close();
      }, 300);
    } catch (e) {
      // ignore if audio not available
    }
  };

  // Speech recognition flow (Web Speech API)
  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const errMsg = "Speech recognition not supported in this browser.";
      setMessages((m) => [...m, { role: "assistant", text: errMsg }]);
      speak(errMsg);
      return;
    }

    playBeep();
    const recog = new SpeechRecognition();
    recog.lang = "en-US";
    recog.interimResults = false;
    recog.maxAlternatives = 1;

    recog.onstart = () => {
      setIsRecording(true);
    };

    recog.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      // Display recognized text in chat BEFORE sending by letting sendMessageToLLM append it
      sendMessageToLLM(transcript);
    };

    recog.onerror = (e) => {
      console.error("Speech recognition error", e);
      setMessages((m) => [...m, { role: "assistant", text: "Sorry, I couldn't hear that." }]);
      setIsRecording(false);
    };

    recog.onend = () => {
      setIsRecording(false);
    };

    // Start recognition shortly after beep so beep doesn't get picked up
    setTimeout(() => {
      try {
        recog.start();
      } catch (e) {
        // Some browsers throw if start called twice
      }
    }, 250);
  };

  // Render
  if (loading) {
    return <p>Loading event data...</p>;
  }

  return (
    <main className="App">
      <h1 id="page-title">TigerTix Events</h1>

      {message && (
        <div role="alert" aria-live="polite" className="status-message">
          {message}
        </div>
      )}

      <section aria-label="Available events">
        <ul aria-label="List of available events">
          {events.length === 0 ? (
            <p>No events available at this time.</p>
          ) : (
            events.map((event) => (
              <li key={event.eventID} className="event-card">
                <h2>{event.title}</h2>
                <p>Date: {event.start_time || "To be announced"}</p>
                <p>Tickets Available: {event.num_tickets}</p>
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
      </section>

      {/* Chat / Voice Section */}
      <section aria-label="Voice chat" className="chat-section">
        <h2>Voice Assistant</h2>
        <div className="chat-window" aria-live="polite">
          {messages.length === 0 && <p className="muted">Tap the microphone and speak a request (for accessibility, try: "show events" or "book 2 tickets for Jazz Night").</p>}
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role}`}>
              <strong className="role">{m.role === 'user' ? 'You' : 'Assistant'}: </strong>
              <span>{m.text}</span>
            </div>
          ))}
        </div>

        <div className="chat-controls">
          <button
            onClick={startRecognition}
            aria-pressed={isRecording}
            aria-label={isRecording ? "Recording" : "Start voice input"}
            className={`mic-button ${isRecording ? 'recording' : ''}`}
          >
            {isRecording ? 'Recording...' : '🎤 Speak'}
          </button>
          <p className="muted">Responses will be spoken aloud; no tickets are booked automatically.</p>
        </div>
      </section>
    </main>
  );
}

export default App;