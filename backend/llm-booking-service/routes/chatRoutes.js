import express from "express";
import { handleChat, parseOnly } from "../controllers/chatController.js";

const router = express.Router();

router.post("/chat", handleChat);
router.post("/llm/parse", parseOnly);

export default router;