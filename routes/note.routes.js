import express from "express";
import adminMiddleware from "../middlewares/admin.mid.js";
import userMiddleware from "../middlewares/user.mid.js";
import {
  createNote,
  createNotePayment,
  getNotes,
  downloadNoteFile,
  getMyPurchasedNotes,
  previewNoteFile,
  phonePeCallback,
  verifyNotePayment,
} from "../controller/note.controller.js";

const router = express.Router();

router.get("/all", getNotes);
router.get("/preview/:noteId", previewNoteFile);
router.get("/download/:noteId", userMiddleware, downloadNoteFile);
router.post("/create", adminMiddleware, createNote);
router.post("/create-payment/:noteId", userMiddleware, createNotePayment);
router.get("/verify-payment", userMiddleware, verifyNotePayment);
router.get("/my-purchased", userMiddleware, getMyPurchasedNotes);
router.post("/phonepe/callback", phonePeCallback);

export default router;
