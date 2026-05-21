/**
 * OPTIONAL AUTH MIDDLEWARE
 * ------------------------
 * Term — Middleware: function that runs BEFORE your route handler (like a security gate).
 * Term — JWT (JSON Web Token): signed string proving "this user logged in".
 *
 * Unlike strict auth, this does NOT block guests — it only sets req.userId when logged in.
 */

import jwt from "jsonwebtoken";
import appConfig from "../../config.js";

export function optionalUserMiddleware(req, res, next) {
  // Default: guest user (no account linked)
  req.userId = null;

  // Your app stores login token in httpOnly cookie named "jwt" (see user.controller login)
  const token = req.cookies?.jwt;

  if (!token) {
    return next();
  }

  try {
    // jwt.verify checks signature + expiry using your secret from .env
    const decoded = jwt.verify(token, appConfig.JWT_USER_PASSWORD);
    req.userId = decoded.id;
  } catch {
    // Invalid/expired token → treat as guest (don't crash the chatbot)
    req.userId = null;
  }

  next();
}
