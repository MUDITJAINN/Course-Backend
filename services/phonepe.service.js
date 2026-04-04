import config from "../config.js";

const normalizeBaseUrl = (url) => (url || "").trim().replace(/\/+$/, "");

export const isPhonePeConfigured = () =>
  Boolean(config.PHONEPE_CLIENT_ID && config.PHONEPE_CLIENT_SECRET && config.PHONEPE_CLIENT_VERSION);

export const getPhonePeAuthBaseUrl = () => normalizeBaseUrl(config.PHONEPE_AUTH_BASE_URL);
export const getPhonePeCheckoutBaseUrl = () => normalizeBaseUrl(config.PHONEPE_CHECKOUT_BASE_URL);

let phonePeTokenCache = {
  token: null,
  expiresAtMs: 0,
};

export const getPhonePeAccessToken = async () => {
  const now = Date.now();
  if (phonePeTokenCache.token && phonePeTokenCache.expiresAtMs - now > 60 * 1000) {
    return phonePeTokenCache.token;
  }

  const body = new URLSearchParams({
    client_id: config.PHONEPE_CLIENT_ID,
    client_version: String(config.PHONEPE_CLIENT_VERSION),
    client_secret: config.PHONEPE_CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const tokenResponse = await fetch(`${getPhonePeAuthBaseUrl()}/v1/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData?.access_token) {
    throw new Error(tokenData?.message || "Unable to fetch PhonePe auth token");
  }

  const expiresAtSec = Number(tokenData.expires_at || 0);
  phonePeTokenCache = {
    token: tokenData.access_token,
    expiresAtMs: expiresAtSec ? expiresAtSec * 1000 : Date.now() + 10 * 60 * 1000,
  };

  return phonePeTokenCache.token;
};

export const getOrderState = (statusData) =>
  statusData?.state || statusData?.data?.state || statusData?.orderState || null;

export const getOrderAmount = (statusData) =>
  Number(statusData?.amount ?? statusData?.data?.amount ?? statusData?.paymentDetails?.amount);
