// tests/voice-integration.test.js
import request from "supertest";
import app from "../backend/llm-booking-service/server.js";

describe("Voice Integration Endpoint", () => {
  it("should process a transcribed voice booking command", async () => {
    const res = await request(app)
      .post("/api/voice")
      .send({ transcript: "book two tickets for the Clemson concert" });
    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toMatch(/booked|confirm/i);
  });
});