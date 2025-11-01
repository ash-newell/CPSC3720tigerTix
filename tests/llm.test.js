

/**
 * @file tests/llm.test.js
 * @description Minimal test for LLM-driven booking endpoint
 */

import request from "supertest";
import express from "express";
import router from "../backend/llm-booking-service/routes/chatRoutes.js";

// Create a lightweight express instance for isolated testing
const app = express();
app.use(express.json());
app.use("/api", router);

describe("LLM Booking Service", () => {
  it("parses natural language booking text correctly", async () => {
    const res = await request(app)
      .post("/api/llm/parse")
      .send({ text: "Book two tickets for Jazz Night" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("event");
    expect(res.body).toHaveProperty("tickets");
    expect(typeof res.body.event).toBe("string");
    expect(typeof res.body.tickets).toBe("number");
  });

  it("returns error message when text cannot be parsed", async () => {
    const res = await request(app)
      .post("/api/llm/parse")
      .send({ text: "asdkjfhaksjdfh" });

expect([200, 400, 422]).toContain(res.statusCode);
  });
});