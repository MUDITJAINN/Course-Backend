import config from "../config.js";
import fs from "fs";
import path from "path";
import { NotePurchase } from "../models/notePurchase.model.js";
import { Note } from "../models/note.model.js";

// Basic env validation so we fail fast with helpful error.
const isPhonePeConfigured = () =>
  config.PHONEPE_CLIENT_ID && config.PHONEPE_CLIENT_SECRET && config.PHONEPE_CLIENT_VERSION;

const normalizeBaseUrl = (url) => (url || "").trim().replace(/\/+$/, "");
const getPhonePeAuthBaseUrl = () => normalizeBaseUrl(config.PHONEPE_AUTH_BASE_URL);
const getPhonePeCheckoutBaseUrl = () => normalizeBaseUrl(config.PHONEPE_CHECKOUT_BASE_URL);

let phonePeTokenCache = {
  token: null,
  expiresAtMs: 0,
};

const getPhonePeAccessToken = async () => {
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

const getOrderState = (statusData) =>
  statusData?.state || statusData?.data?.state || statusData?.orderState || null;

const getOrderAmount = (statusData) =>
  Number(statusData?.amount ?? statusData?.data?.amount ?? statusData?.paymentDetails?.amount);

// Files are stored on the backend (Render). They should NOT be in `frontend/public`,
// otherwise they are downloadable via direct URL / inspect.
const SECURE_NOTES_DIR = path.isAbsolute(config.NOTE_FILES_DIR)
  ? config.NOTE_FILES_DIR
  : path.join(process.cwd(), config.NOTE_FILES_DIR);

const getBasenameFromUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  const cleaned = url.split("?")[0].split("#")[0];
  return cleaned.split("/").filter(Boolean).pop() || "";
};

const getNoteFileOnDisk = (note, kind) => {
  const fileUrl = kind === "preview" ? note.previewFileUrl : note.downloadFileUrl;
  const filename = getBasenameFromUrl(fileUrl);
  if (!filename) return null;
  const fullPath = path.join(SECURE_NOTES_DIR, filename);
  if (!fs.existsSync(fullPath)) return null;
  return { fullPath, filename };
};

const getMimeType = (filename) => {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
};

export const createNotePayment = async (req, res) => {
  const { noteId } = req.params;
  const { userId } = req;

  if (!isPhonePeConfigured()) {
    return res.status(500).json({
      errors:
        "PhonePe is not configured. Set PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY and PHONEPE_SALT_INDEX in backend env.",
    });
  }

  try {
    const note = await Note.findOne({ _id: noteId, isPublished: true });
    if (!note) {
      return res.status(404).json({ errors: "Invalid note selected" });
    }

    // User-note level lock: don't allow duplicate successful purchase rows.
    const alreadyPurchased = await NotePurchase.findOne({
      userId,
      noteId,
      status: "SUCCESS",
    });

    if (alreadyPurchased) {
      return res.status(400).json({ errors: "You already purchased this note" });
    }

    const merchantTransactionId = `NOTE_${Date.now()}_${Math.floor(
      Math.random() * 100000
    )}`;

    const accessToken = await getPhonePeAccessToken();
    const requestPayload = {
      merchantOrderId: merchantTransactionId,
      amount: note.price * 100,
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: `Payment for ${note.title}`,
        merchantUrls: {
          redirectUrl: `${config.FRONTEND_URL}/notes?noteId=${encodeURIComponent(
            noteId
          )}&merchantOrderId=${encodeURIComponent(merchantTransactionId)}`,
        },
      },
    };

    const phonePeResponse = await fetch(`${getPhonePeCheckoutBaseUrl()}/checkout/v2/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${accessToken}`,
        accept: "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    const data = await phonePeResponse.json();

    const hasRedirectUrl = Boolean(data?.redirectUrl || data?.data?.redirectUrl);
    const isCreatePaymentSuccess = phonePeResponse.ok && hasRedirectUrl;

    if (!isCreatePaymentSuccess) {
      return res.status(400).json({
        errors: data?.message || "Unable to start payment",
        data,
      });
    }

    await NotePurchase.create({
      userId,
      noteId,
      amountInPaise: note.price * 100,
      merchantTransactionId,
      status: "PENDING",
      gatewayResponse: data,
    });

    // PhonePe may return redirect url in either shape; handle both safely.
    const paymentUrl =
      data?.redirectUrl ||
      data?.data?.redirectUrl ||
      null;

    if (!paymentUrl) {
      return res.status(400).json({ errors: "PhonePe payment URL not found" });
    }

    return res.status(200).json({
      message: "Payment initiated",
      paymentUrl,
      merchantTransactionId,
    });
  } catch (error) {
    console.log("Error in createNotePayment", error);
    return res.status(500).json({ errors: "Error in creating note payment" });
  }
};

export const verifyNotePayment = async (req, res) => {
  const { noteId, merchantOrderId, transactionId } = req.query;
  const { userId } = req;
  const resolvedOrderId = merchantOrderId || transactionId;

  if (!noteId || !resolvedOrderId) {
    return res.status(400).json({ errors: "noteId and merchantOrderId are required" });
  }

  if (!isPhonePeConfigured()) {
    return res.status(500).json({
      errors:
        "PhonePe is not configured. Set PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY and PHONEPE_SALT_INDEX in backend env.",
    });
  }

  try {
    const note = await Note.findById(noteId);
    if (!note) {
      return res.status(404).json({ errors: "Invalid note selected" });
    }

    // Critical check: only same user who started payment can verify/unlock it.
    const existingPayment = await NotePurchase.findOne({
      userId,
      noteId,
      merchantTransactionId: resolvedOrderId,
    });

    if (!existingPayment) {
      return res.status(404).json({ errors: "Payment transaction not found for this user" });
    }

    const accessToken = await getPhonePeAccessToken();
    const statusCandidates = [
      `${getPhonePeCheckoutBaseUrl()}/checkout/v2/order/${encodeURIComponent(
        resolvedOrderId
      )}/status`,
      `${getPhonePeCheckoutBaseUrl()}/checkout/v2/status/${encodeURIComponent(resolvedOrderId)}`,
    ];
    let statusData = null;
    let statusResponse = null;
    for (const url of statusCandidates) {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${accessToken}`,
          accept: "application/json",
        },
      });
      const data = await response.json();
      if (response.ok) {
        statusResponse = response;
        statusData = data;
        break;
      }
      if (!statusData) {
        statusResponse = response;
        statusData = data;
      }
    }

    const paidAmount = getOrderAmount(statusData); // in paise
    const paymentState = getOrderState(statusData);
    // Unlock only on strict success + exact amount match.
    const isSuccess =
      statusResponse.ok &&
      ["COMPLETED", "SUCCESS", "PAID"].includes(paymentState) &&
      paidAmount === note.price * 100;

    existingPayment.gatewayResponse = statusData;
    existingPayment.status = isSuccess ? "SUCCESS" : "FAILED";
    await existingPayment.save();

    if (!isSuccess) {
      return res.status(400).json({
        errors: "Payment not completed or amount mismatch",
        paymentState: paymentState || "UNKNOWN",
      });
    }

    return res.status(200).json({
      message: "Payment verified. Notes unlocked.",
      noteId,
      unlocked: true,
    });
  } catch (error) {
    console.log("Error in verifyNotePayment", error);
    return res.status(500).json({ errors: "Error in payment verification" });
  }
};

export const getMyPurchasedNotes = async (req, res) => {
  const { userId } = req;
  try {
    // Frontend uses this list to decide which notes can be downloaded.
    const purchases = await NotePurchase.find(
      { userId, status: "SUCCESS" },
      { noteId: 1, _id: 0 }
    );
    const noteIds = purchases.map((item) => String(item.noteId));
    return res.status(200).json({ noteIds });
  } catch (error) {
    console.log("Error in getMyPurchasedNotes", error);
    return res.status(500).json({ errors: "Error in fetching purchased notes" });
  }
};

export const getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ isPublished: true }).sort({ createdAt: -1 });
    return res.status(200).json({ notes });
  } catch (error) {
    console.log("Error in getNotes", error);
    return res.status(500).json({ errors: "Error in fetching notes" });
  }
};

export const createNote = async (req, res) => {
  const adminId = req.adminId;
  const { title, description, price, pages, previewImageUrl, previewFileUrl, downloadFileUrl } = req.body;
  try {
    if (!title || !description || !price || !pages || !previewImageUrl || !downloadFileUrl) {
      return res.status(400).json({ errors: "All note fields are required" });
    }
    const note = await Note.create({
      title,
      description,
      price: Number(price),
      pages: Number(pages),
      previewImageUrl,
      previewFileUrl: previewFileUrl || "",
      downloadFileUrl,
      creatorId: adminId,
    });
    return res.status(201).json({ message: "Note created", note });
  } catch (error) {
    console.log("Error in createNote", error);
    return res.status(500).json({ errors: "Error in creating note" });
  }
};

export const phonePeCallback = async (req, res) => {
  try {
    const callbackData = req.body;
    const transactionId = callbackData?.data?.merchantTransactionId;

    // Callback is stored for audit/debug. Unlock still happens only after verify endpoint.
    if (transactionId) {
      await NotePurchase.findOneAndUpdate(
        { merchantTransactionId: transactionId },
        { gatewayResponse: callbackData },
        { new: true }
      );
    }

    return res.status(200).json({ message: "Callback received" });
  } catch (error) {
    console.log("Error in phonePeCallback", error);
    return res.status(500).json({ errors: "Error handling callback" });
  }
};

// Preview file is public, but served from backend private storage.
// Note: this does not prevent someone from viewing the PDF if they call this endpoint directly.
// Download is protected by payment verification (see `downloadNoteFile`).
export const previewNoteFile = async (req, res) => {
  const { noteId } = req.params;
  try {
    const note = await Note.findOne({ _id: noteId, isPublished: true });
    if (!note) return res.status(404).json({ errors: "Note not found" });

    const file = getNoteFileOnDisk(note, "preview") || getNoteFileOnDisk(note, "download");
    if (!file) return res.status(404).json({ errors: "Preview file missing on server" });

    const mime = getMimeType(file.filename);
    res.setHeader("Content-Type", mime);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${file.filename}"`
    );
    fs.createReadStream(file.fullPath).pipe(res);
  } catch (error) {
    console.log("Error in previewNoteFile", error);
    return res.status(500).json({ errors: "Error serving preview file" });
  }
};

// Download is protected: only users who successfully paid can download from backend.
export const downloadNoteFile = async (req, res) => {
  const { noteId } = req.params;
  const { userId } = req;
  try {
    const note = await Note.findOne({ _id: noteId, isPublished: true });
    if (!note) return res.status(404).json({ errors: "Note not found" });

    const purchase = await NotePurchase.findOne({
      userId,
      noteId: note._id,
      status: "SUCCESS",
    });
    if (!purchase) return res.status(403).json({ errors: "Payment required to download" });

    const file = getNoteFileOnDisk(note, "download");
    if (!file) return res.status(404).json({ errors: "Download file missing on server" });

    const mime = getMimeType(file.filename);
    res.setHeader("Content-Type", mime);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.filename}"`
    );
    fs.createReadStream(file.fullPath).pipe(res);
  } catch (error) {
    console.log("Error in downloadNoteFile", error);
    return res.status(500).json({ errors: "Error serving download file" });
  }
};
