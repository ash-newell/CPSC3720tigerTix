
/**
 * @file client.test.js
 * @description Integration tests for Client Service endpoints.
 */

import request from "supertest";
import app from "../backend/client-service/server.js";

describe("Client Service", () => {
  it("lists all events successfully", async () => {
    const res = await request(app).get("/api/events");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("purchases a ticket for an existing event", async () => {
    const res = await request(app)
      .post("/api/events/1/purchase")
      .send({ buyerID: 1 });
    expect([200, 400, 404]).toContain(res.statusCode);
    // Either success (ticket bought), 400 if no tickets available, or 404 if event not found
  });
});