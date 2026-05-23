import { CourseLecture } from "../../models/courseLecture.model.js";
import { Note } from "../../models/note.model.js";
import { lectureFilter, TUTOR_RESOURCE } from "../utils/tutorResource.js";
import { chunkText } from "./chunking.service.js";
import { createEmbedding } from "./embedding.service.js";
import { createVectorStore } from "./vectorStore/index.js";
import {
  extractNotePdfText,
  formatPagesForRag,
  getPdfSectionTitle,
} from "./pdfExtract.service.js";

async function syncNotePdfSection(noteId, config) {
  const note = await Note.findById(noteId).lean();
  if (!note) return { pdfIngested: false, reason: "note-not-found" };

  const extracted = await extractNotePdfText(note, config);
  if (!extracted) {
    return {
      pdfIngested: false,
      reason: "pdf-missing-or-unreadable",
      hint:
        config.pdfStorage === "r2"
          ? `Upload PDF to R2 bucket ${config.r2Bucket} as ${note.downloadFileUrl?.split("/").pop()}`
          : `Place PDF in secure-notes/ matching downloadFileUrl basename`,
    };
  }

  const content = formatPagesForRag(extracted.pages).slice(0, 120_000);
  const title = getPdfSectionTitle(note.title);

  await CourseLecture.findOneAndUpdate(
    { noteId, title },
    { noteId, title, order: 9999, content, durationMinutes: 0 },
    { upsert: true, new: true }
  );

  return {
    pdfIngested: true,
    pdfPages: extracted.pages.length,
    pdfFilename: extracted.filename,
    pdfSource: extracted.source,
    chars: content.length,
  };
}

export async function indexTutorResource(resourceType, resourceId, config) {
  let pdfMeta = null;
  let pdfFilename = "";

  if (resourceType === TUTOR_RESOURCE.NOTE) {
    pdfMeta = await syncNotePdfSection(resourceId, config);
    pdfFilename = pdfMeta?.pdfFilename || "";
    console.log("[ai-tutor] note PDF sync:", pdfMeta);
  }

  const filter = lectureFilter(resourceType, resourceId);
  const lectures = await CourseLecture.find(filter).sort({ order: 1, createdAt: 1 });

  if (!lectures.length) {
    return { lectureCount: 0, chunkCount: 0, pdfMeta, vectorStore: config.vectorStore };
  }

  const store = createVectorStore(config);
  await store.deleteResource(resourceType, resourceId);

  let chunkCount = 0;

  for (const lecture of lectures) {
    const pieces = chunkText(lecture.content, {
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
    });

    for (let i = 0; i < pieces.length; i++) {
      const embedding = await createEmbedding(config, pieces[i]);

      await store.saveChunk({
        resourceType,
        resourceId,
        courseId: resourceType === TUTOR_RESOURCE.COURSE ? resourceId : undefined,
        noteId: resourceType === TUTOR_RESOURCE.NOTE ? resourceId : undefined,
        lectureId: lecture._id,
        lectureTitle: lecture.title,
        chunkIndex: i,
        text: pieces[i],
        embedding,
        pdfFilename,
      });
      chunkCount += 1;
    }
  }

  return {
    lectureCount: lectures.length,
    chunkCount,
    pdfMeta,
    vectorStore: store.provider,
  };
}

export async function indexCourseLectures(courseId, config) {
  return indexTutorResource(TUTOR_RESOURCE.COURSE, courseId, config);
}
