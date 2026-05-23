import fs from "fs";
import path from "path";
import config from "../../config.js";
import { getPdfBufferFromR2, isR2Configured } from "./r2Storage.service.js";

const SECURE_NOTES_DIR = path.isAbsolute(config.NOTE_FILES_DIR)
  ? config.NOTE_FILES_DIR
  : path.join(process.cwd(), config.NOTE_FILES_DIR);

export const PDF_SECTION_PREFIX = "Full PDF —";

export function getPdfSectionTitle(noteTitle) {
  return `${PDF_SECTION_PREFIX} ${noteTitle}`;
};

const getBasenameFromUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  const cleaned = url.split("?")[0].split("#")[0];
  return cleaned.split("/").filter(Boolean).pop() || "";
};

export function splitTextIntoPages(text, totalPages = 0) {
  const normalized = String(text || "").trim();
  if (!normalized) return [];

  if (normalized.includes("\f")) {
    return normalized
      .split("\f")
      .map((t, i) => ({ page: i + 1, text: t.trim() }))
      .filter((p) => p.text.length > 30);
  }

  const pages = Number(totalPages) > 1 ? Number(totalPages) : 0;
  if (pages > 1) {
    const perPage = Math.ceil(normalized.length / pages);
    const result = [];
    for (let i = 0; i < pages; i++) {
      const slice = normalized.slice(i * perPage, (i + 1) * perPage).trim();
      if (slice) result.push({ page: i + 1, text: slice });
    }
    if (result.length) return result;
  }

  return [{ page: 1, text: normalized }];
}

export function formatPagesForRag(pages) {
  return pages.map((p) => `[Page ${p.page}]\n${p.text}`).join("\n\n");
}

/** Load PDF bytes: R2 (production) → local secure-notes (dev) */
export async function getNotePdfBuffer(note, tutorConfig) {
  const filename = getBasenameFromUrl(note.downloadFileUrl);
  if (!filename || !filename.toLowerCase().endsWith(".pdf")) {
    return { buffer: null, filename: "", source: null };
  }

  if (tutorConfig && isR2Configured(tutorConfig)) {
    try {
      const buffer = await getPdfBufferFromR2(tutorConfig, filename);
      return { buffer, filename, source: "r2" };
    } catch (err) {
      console.warn("[ai-tutor] R2 PDF read failed:", err.message);
    }
  }

  const fullPath = path.join(SECURE_NOTES_DIR, filename);
  if (!fs.existsSync(fullPath)) {
    console.warn(`[ai-tutor] PDF not found: ${fullPath}`);
    return { buffer: null, filename, source: null, expectedPath: fullPath };
  }

  return { buffer: fs.readFileSync(fullPath), filename, source: "local", expectedPath: fullPath };
}

export async function extractNotePdfText(note, tutorConfig) {
  const { buffer, filename, source, expectedPath } = await getNotePdfBuffer(note, tutorConfig);
  if (!buffer) {
    return null;
  }

  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    const text = String(data?.text || "").trim();
    if (text.length < 50) {
      console.warn(`[ai-tutor] PDF text too short (${text.length} chars): ${filename}`);
      return null;
    }
    return {
      rawText: text,
      numPdfPages: data.numpages || note.pages || 0,
      pages: splitTextIntoPages(text, data.numpages || note.pages),
      filename,
      source,
      expectedPath,
    };
  } catch (error) {
    console.warn("[ai-tutor] PDF extract failed:", error.message);
    return null;
  }
}
