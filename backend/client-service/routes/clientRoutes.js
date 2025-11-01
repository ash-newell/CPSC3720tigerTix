/**
 * @file clientRoutes.js
 * @description Defines client routes for viewing and purchasing tickets.
 */

import express from "express";
import { listEvents, purchaseTicket } from "../controllers/clientController.js";

const router = express.Router();

router.get("/events", listEvents);
router.post("/events/:id/purchase", purchaseTicket);

export default router;