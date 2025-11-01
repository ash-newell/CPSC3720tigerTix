import express from "express";
import bodyParser from "body-parser";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();
app.use(bodyParser.json());
app.use("/api", chatRoutes);

export default app;

if (process.env.NODE_ENV !== "test") {
  const PORT = 7001;
  app.listen(PORT, () =>
    console.log(`LLM Booking Service running on port ${PORT}`)
  );
}