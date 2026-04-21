import dotenv from "dotenv";
dotenv.config();

const JWT_USER_PASSWORD = process.env.JWT_USER_PASSWORD;
const JWT_ADMIN_PASSWORD = process.env.JWT_ADMIN_PASSWORD;
// PhonePe values below come from your PhonePe merchant dashboard.
const PHONEPE_BASE_URL =
  process.env.PHONEPE_BASE_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";
const PHONEPE_AUTH_BASE_URL = process.env.PHONEPE_AUTH_BASE_URL || PHONEPE_BASE_URL;
const PHONEPE_CHECKOUT_BASE_URL = process.env.PHONEPE_CHECKOUT_BASE_URL || PHONEPE_BASE_URL;
// New API credential naming from docs (with fallback to old env keys).
const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID || process.env.PHONEPE_MERCHANT_ID;
const PHONEPE_CLIENT_SECRET =
  process.env.PHONEPE_CLIENT_SECRET || process.env.PHONEPE_SALT_KEY;
const PHONEPE_CLIENT_VERSION =
  process.env.PHONEPE_CLIENT_VERSION || process.env.PHONEPE_SALT_INDEX || "1";
// Used to build redirect/callback URLs in payment flow.
// const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4001";
// const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;
const NOTE_FILES_DIR = process.env.NOTE_FILES_DIR || "secure-notes";

export default {
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
};