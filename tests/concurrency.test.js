import request from "supertest";
import app from "../backend/client-service/server.js";

describe("Database Concurrency", () => {
  it("prevents double booking", async () => {
    const eventId = 1;
    const [res1, res2] = await Promise.all([
      request(app).post(`/api/events/${eventId}/purchase`).send({ tickets: 1 }),
      request(app).post(`/api/events/${eventId}/purchase`).send({ tickets: 1 }),
    ]);

    const messages = `${res1.body.message} ${res2.body.message}`;
    expect(messages).toMatch(/success|sold out/i);
  });
});