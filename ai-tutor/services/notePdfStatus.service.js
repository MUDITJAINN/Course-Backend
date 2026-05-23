import fs from "fs";
import path from "path";
import config from "../../config.js";
import { loadTutorConfig } from "../config.js";
import { isR2Configured } from "./r2Storage.service.js";

const SECURE_NOTES_DIR = path.isAbsolute(config.NOTE_FILES_DIR)
  ? config.NOTE_FILES_DIR
  : path.join(process.cwd(), config.NOTE_FILES_DIR);

export function getNotePdfStatus(note) {
  const tutorConfig = loadTutorConfig();
  const downloadFileUrl = note?.downloadFileUrl || "";
  const basename = downloadFileUrl.split("?")[0].split("#")[0].split("/").filter(Boolean).pop() || "";
  const expectedPath = basename ? path.join(SECURE_NOTES_DIR, basename) : "";
  const localExists = Boolean(basename && expectedPath && fs.existsSync(expectedPath));

  const storage = tutorConfig.pdfStorage;
  const r2Ready = isR2Configured(tutorConfig);

  return {
    storage,
    secureNotesDir: SECURE_NOTES_DIR,
    r2Bucket: tutorConfig.r2Bucket,
    downloadFileUrl,
    expectedFilename: basename,
    expectedPath,
    pdfOnDisk: storage === "r2" ? r2Ready : localExists,
    localPdfExists: localExists,
    r2Configured: r2Ready,
    hint: localExists
      ? "PDF found locally. Click Reindex RAG."
      : storage === "r2" && r2Ready
        ? `PDF expected in R2 bucket "${tutorConfig.r2Bucket}" as key: ${basename}`
        : basename
          ? `Copy PDF to: ${expectedPath} OR upload to R2 and set PDF_STORAGE=r2`
          : "Set downloadFileUrl on the note (e.g. /notes/TypeScript-notes.pdf)",
  };
}
