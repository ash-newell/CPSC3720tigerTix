/**
 * These tests verify that the client microservice can
 * list available events
 * process ticket puchases
 * handle overbooking attempts
 */
import request from "supertest";
import app from "../backend/client-service/server.js";

describe("Client Service", () => {
//test 1 - list events
  it("lists all events", async () => {
    const res = await request(app).get("/api/events");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  //test 2 - book tickets
  it("books a ticket successfully", async () => {
    const res = await request(app)
      .post("/api/events/1/purchase")
      .send({ tickets: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/success/i);
  });

  //test 3 - prevent overbooking
  it("prevents overbooking", async () => {
    const res = await request(app)
      .post("/api/events/99/purchase")
      .send({ tickets: 1 });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/sold out/i);
  });
});