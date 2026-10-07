import { Router } from "express";
import { getMessages, postMessage } from "../controllers/messageController.js";
import { authMiddleware } from "../middleware/auth.js";

export const messageRoutes = Router();

// A thread belongs to the two accounts that exchange it, so both handlers need
// the verified bearer identity instead of answering every anonymous caller.
messageRoutes.use(authMiddleware);
messageRoutes.get("/", getMessages);
messageRoutes.post("/", postMessage);
