import express from "express";
import { handleChat, parseOnly } from "../controllers/chatController.js";

const router = express.Router();

router.post("/chat", handleChat);
// alias `/voice` to the same handler so voice-enabled clients/tests can POST transcripts
router.post("/voice", handleChat);
router.post("/llm/parse", parseOnly);

export default router;