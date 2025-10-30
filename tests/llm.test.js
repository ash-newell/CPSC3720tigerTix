import request from "supertest";
import app from "../backend/llm-booking-service/server.js";
import { parseIntent } from "../backend/llm-booking-service/utils/intentParser.js";

describe("LLM Booking Service", () => {
  test("parses booking intent correctly", () => {
    const message = "book 2 tickets for Clemson concert";
    const result = parseIntent(message);
    expect(result.intent).toBe("book");
    expect(result.event).toMatch(/clemson/i);
    expect(result.quantity).toBe(2);
  });

  test("responds with event list", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ message: "show events" });
    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toMatch(/events/i);
  });

  test("confirms booking on confirmation", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ message: "yes book the Clemson concert" });
    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toMatch(/booked/i);
  });
});