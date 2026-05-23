import dotenv from "dotenv";
import { loadChatbotConfig } from "./ai-chatbot/config.js";
import { loadTutorConfig } from "./ai-tutor/config.js";

dotenv.config();

const trim = (value) => String(value ?? "").trim().replace(/^["']+|["']+$/g, "");

const normalizeBaseUrl = (url) => trim(url).replace(/\/+$/, "");

const normalizeHttpUrl = (url) => {
  const raw = normalizeBaseUrl(url);
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) return `https://${raw}`;
  return raw;
};

const normalizeOrigin = (url) => {
  const cleaned = trim(url);
  if (!cleaned) return "";
  try {
    return new URL(cleaned).origin;
  } catch {
    return cleaned.replace(/\/+$/, "");
  }
};

const toInt = (value, fallback) => {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
};

const env = process.env;

const JWT_USER_PASSWORD = trim(env.JWT_USER_PASSWORD);
const JWT_ADMIN_PASSWORD = trim(env.JWT_ADMIN_PASSWORD);

const PHONEPE_BASE_URL = normalizeBaseUrl(env.PHONEPE_BASE_URL);
const PHONEPE_AUTH_BASE_URL = normalizeBaseUrl(env.PHONEPE_AUTH_BASE_URL) || PHONEPE_BASE_URL;
const PHONEPE_CHECKOUT_BASE_URL =
  normalizeBaseUrl(env.PHONEPE_CHECKOUT_BASE_URL) || PHONEPE_BASE_URL;

const PHONEPE_CLIENT_ID = trim(env.PHONEPE_CLIENT_ID || env.PHONEPE_MERCHANT_ID);
const PHONEPE_CLIENT_SECRET = trim(env.PHONEPE_CLIENT_SECRET || env.PHONEPE_SALT_KEY);
const PHONEPE_CLIENT_VERSION = trim(env.PHONEPE_CLIENT_VERSION || env.PHONEPE_SALT_INDEX);

const BACKEND_URL = normalizeHttpUrl(env.BACKEND_URL);
const FRONTEND_URL = normalizeHttpUrl(env.FRONTEND_URL);
const NOTE_FILES_DIR = trim(env.NOTE_FILES_DIR);

const corsOriginCandidates = [
  env.FRONTEND_URL,
  env.FRONTEND_URL1,
  env.FRONTEND_URL2,
  env.FRONTEND_URL3,
  env.FRONTEND_URL4,
  env.BACKEND_URL,
];

const corsOrigins = [...new Set(corsOriginCandidates.map(normalizeOrigin).filter(Boolean))];

const frameAncestorOrigins = corsOrigins;

const config = {
  port: toInt(env.PORT, 4000),
  nodeEnv: trim(env.NODE_ENV) || "development",
  mongoUri: trim(env.MONGO_URI),

  JWT_USER_PASSWORD,
  JWT_ADMIN_PASSWORD,

  PHONEPE_BASE_URL,
  PHONEPE_AUTH_BASE_URL,
  PHONEPE_CHECKOUT_BASE_URL,
  PHONEPE_CLIENT_ID,
  PHONEPE_CLIENT_SECRET,
  PHONEPE_CLIENT_VERSION,

  BACKEND_URL,
  FRONTEND_URL,
  NOTE_FILES_DIR,

  corsOrigins,
  frameAncestorOrigins,

  cloudinary: {
    cloud_name: trim(env.cloud_name),
    api_key: trim(env.api_key),
    api_secret: trim(env.api_secret),
  },

  siteName: trim(env.SITE_NAME),

  chatbot: loadChatbotConfig(),
  tutor: loadTutorConfig(),
};

export default config;
