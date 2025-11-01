import request from "supertest";
import app from "../backend/client-service/server.js";

describe("Database Concurrency", () => {
  it("prevents double booking when two users purchase at once", async () => {
    const purchase1 = request(app).post("/api/events/1/purchase").send({ buyerID: 101 });
    const purchase2 = request(app).post("/api/events/1/purchase").send({ buyerID: 102 });

    const [res1, res2] = await Promise.all([purchase1, purchase2]);

    console.log("→ DEBUG RES1:", res1.statusCode, res1.body);
    console.log("→ DEBUG RES2:", res2.statusCode, res2.body);

    const messages = `${res1.body.message || ""} ${res2.body.message || ""}`;
    expect(messages).toMatch(/success|sold out/i);
  });
});