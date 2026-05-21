/**
 * LEVEL 2 CHATBOT — GLOSSARY (read this while exploring the code)
 * ================================================================
 *
 * API (Application Programming Interface)
 *   Contract between frontend and backend. Example: POST /chat/stream
 *
 * Async / await
 *   Wait for slow work (database, HTTP) without freezing the whole server.
 *
 * Controller
 *   Express layer that reads req/res and calls services. Thin — no heavy logic.
 *
 * Cookie (httpOnly)
 *   Small data browser sends automatically. httpOnly = JavaScript cannot read it (safer for tokens).
 *
 * CORS
 *   Browser security: backend must allow your frontend origin to call APIs.
 *
 * Express Middleware
 *   Function(req, res, next) that runs before the route handler (auth, rate limit).
 *
 * fetch
 *   Browser/Node HTTP client used to call Groq/OpenAI or your own API.
 *
 * JWT (JSON Web Token)
 *   Signed login proof. Your app stores it in cookie "jwt" after login.
 *
 * LLM (Large Language Model)
 *   AI that generates text (via Groq, OpenAI, etc.).
 *
 * Markdown
 *   Simple text formatting (**bold**, lists). Rendered in chat with react-markdown.
 *
 * Memory (this project)
 *   Short summary saved on ChatSession.memorySummary — not full long-term AI memory yet.
 *
 * MongoDB / Mongoose
 *   Database + ODM (Object Document Mapper) for JavaScript schemas/models.
 *
 * Prompt
 *   Messages sent to the LLM: system (rules), user (question), assistant (answer).
 *
 * Rate limiting
 *   Block too many requests per IP per minute (abuse protection).
 *
 * React Hook (useState, useEffect, useCallback)
 *   Reusable stateful logic inside functional components.
 *
 * RAG-lite (Level 2 here)
 *   Inject site knowledge + course/note catalog into the system prompt (not vector search yet).
 *
 * REST
 *   HTTP style APIs: GET /session, POST /chat/stream.
 *
 * Service layer
 *   Business logic (sessions, LLM calls) separated from HTTP controllers.
 *
 * Session
 *   One conversation thread stored in ChatSession + many ChatMessage rows.
 *
 * SSE (Server-Sent Events)
 *   One HTTP response that pushes many events (streaming tokens) to the browser.
 *
 * Streaming
 *   Show the answer word-by-word as the model generates it.
 *
 * Term — Zod
 *   Validates JSON body shape before processing (prevents bad client data).
 *
 * Vector DB / Embeddings (Level 4 — not implemented yet)
 *   Semantic search over documents for advanced RAG.
 */

export const CHATBOT_LEVEL = 2;
