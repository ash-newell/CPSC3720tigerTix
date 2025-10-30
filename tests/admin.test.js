/**
 * verifies the the admin microservice can
 * create events correctly
 * retrieve events
 * handle invalid inputs
 */
import request from "supertest";
import app from "../backend/admin-service/server.js";


describe("Admin Service", () => {
//test 1 - create event
  it("creates a new event", async () => {
    const res = await request(app)
      .post("/api/events")
      .send({ name: "Clemson Game", total_tickets: 100, price: 25 });
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe("Clemson Game");
  });

  //test 2 - retrieve events
  it("retrieves all events", async () => {
    const res = await request(app).get("/api/events");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  //test 3 - input validation
  it("rejects missing fields", async () => {
    const res = await request(app)
      .post("/api/events")
      .send({ total_tickets: 20 });
    expect(res.statusCode).toBe(400);
  });
});








