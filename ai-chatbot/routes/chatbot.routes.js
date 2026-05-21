import { Router } from "express";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { optionalUserMiddleware } from "../middleware/optionalUser.js";

/**
 * ROUTER — groups URLs under /api/v1/chatbot/*
 * Term — Express Router: mini-app for related endpoints.
 */
export function createChatbotRouter({ controller, rateLimitPerMinute = 15 }) {
  const router = Router();
  const limiter = createRateLimiter({ limitPerMinute: rateLimitPerMinute });

  router.use(optionalUserMiddleware);

  router.get("/status", controller.getStatus);
  router.get("/session", controller.getSession);
  router.post("/session/new", limiter, controller.postNewSession);

  router.post("/chat", limiter, controller.postChat);
  router.post("/chat/stream", limiter, controller.postChatStream);

  return router;
}
