import { Course } from "../../models/course.model.js";
import { Note } from "../../models/note.model.js";
import { CourseLecture } from "../../models/courseLecture.model.js";
import { CourseChunk } from "../../models/courseChunk.model.js";
import { lectureSchema } from "../validators/tutor.validator.js";
import { indexTutorResource } from "../services/indexing.service.js";
import { lectureFilter, chunkFilter, TUTOR_RESOURCE } from "../utils/tutorResource.js";
import { getNotePdfStatus } from "../services/notePdfStatus.service.js";

export function createTutorAdminController({ config }) {
  function makeListLectures(resourceType) {
    return async (req, res) => {
      try {
        const resourceId =
          resourceType === TUTOR_RESOURCE.NOTE ? req.params.noteId : req.params.courseId;
        const lectures = await CourseLecture.find(lectureFilter(resourceType, resourceId))
          .sort({ order: 1 })
          .lean();
        const chunkCount = await CourseChunk.countDocuments(
          chunkFilter(resourceType, resourceId)
        );
        return res.json({ success: true, lectures, chunkCount, resourceType });
      } catch (error) {
        console.error("[ai-tutor] admin listLectures", error.message);
        return res.status(500).json({ success: false, message: "Could not list sections" });
      }
    };
  }

  function makeAddLecture(resourceType) {
    return async (req, res) => {
      try {
        const parsed = lectureSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            success: false,
            message: parsed.error.errors?.[0]?.message || "Invalid section data",
          });
        }

        const resourceId =
          resourceType === TUTOR_RESOURCE.NOTE ? req.params.noteId : req.params.courseId;

        if (resourceType === TUTOR_RESOURCE.NOTE) {
          const note = await Note.findById(resourceId);
          if (!note) {
            return res.status(404).json({ success: false, message: "Note not found" });
          }
        } else {
          const course = await Course.findById(resourceId);
          if (!course) {
            return res.status(404).json({ success: false, message: "Course not found" });
          }
        }

        const { title, content, order, videoUrl, durationMinutes } = parsed.data;
        const lecture = await CourseLecture.create({
          ...(resourceType === TUTOR_RESOURCE.NOTE
            ? { noteId: resourceId }
            : { courseId: resourceId }),
          title,
          content,
          order: order ?? 0,
          videoUrl: videoUrl || "",
          durationMinutes: durationMinutes ?? 0,
        });

        return res.status(201).json({ success: true, lecture });
      } catch (error) {
        console.error("[ai-tutor] admin addLecture", error.message);
        return res.status(500).json({ success: false, message: "Could not add section" });
      }
    };
  }

  async function deleteLecture(req, res) {
    try {
      const { lectureId } = req.params;
      const lecture = await CourseLecture.findByIdAndDelete(lectureId);
      if (!lecture) {
        return res.status(404).json({ success: false, message: "Section not found" });
      }
      await CourseChunk.deleteMany({ lectureId: lecture._id });
      return res.json({ success: true, message: "Section deleted" });
    } catch (error) {
      console.error("[ai-tutor] admin deleteLecture", error.message);
      return res.status(500).json({ success: false, message: "Could not delete section" });
    }
  }

  function makeReindex(resourceType) {
    return async (req, res) => {
      try {
        const resourceId =
          resourceType === TUTOR_RESOURCE.NOTE ? req.params.noteId : req.params.courseId;

        if (resourceType === TUTOR_RESOURCE.NOTE) {
          const note = await Note.findById(resourceId);
          if (!note) {
            return res.status(404).json({ success: false, message: "Note not found" });
          }
        } else {
          const course = await Course.findById(resourceId);
          if (!course) {
            return res.status(404).json({ success: false, message: "Course not found" });
          }
        }

        let pdfStatus = null;
        if (resourceType === TUTOR_RESOURCE.NOTE) {
          const note = await Note.findById(resourceId).lean();
          pdfStatus = getNotePdfStatus(note);
        }

        const result = await indexTutorResource(resourceType, resourceId, config);

        if (result.chunkCount === 0) {
          const hint =
            resourceType === TUTOR_RESOURCE.NOTE
              ? pdfStatus?.hint ||
                result.pdfMeta?.hint ||
                "Add PDF to secure-notes or paste a section, then reindex."
              : "Add course sections in the form below, then reindex.";
          return res.status(400).json({
            success: false,
            message: `Nothing indexed — ${hint}`,
            pdfStatus,
            ...result,
          });
        }

        return res.json({
          success: true,
          message:
            resourceType === TUTOR_RESOURCE.NOTE
              ? "Note indexed for RAG"
              : "Course indexed for RAG",
          pdfStatus,
          ...result,
        });
      } catch (error) {
        console.error("[ai-tutor] admin reindex", error.message);
        return res.status(500).json({
          success: false,
          message: error.message || "Reindex failed. Is Ollama running with embed model?",
        });
      }
    };
  }

  async function getNoteRagPrep(req, res) {
    try {
      const note = await Note.findById(req.params.noteId).lean();
      if (!note) {
        return res.status(404).json({ success: false, message: "Note not found" });
      }
      const pdfStatus = getNotePdfStatus(note);
      const chunkCount = await CourseChunk.countDocuments({
        noteId: note._id,
      });
      return res.json({
        success: true,
        noteTitle: note.title,
        pages: note.pages,
        pdfStatus,
        indexedChunks: chunkCount,
      });
    } catch (error) {
      console.error("[ai-tutor] getNoteRagPrep", error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  return {
    getNoteRagPrep,
    listCourseLectures: makeListLectures(TUTOR_RESOURCE.COURSE),
    listNoteLectures: makeListLectures(TUTOR_RESOURCE.NOTE),
    addCourseLecture: makeAddLecture(TUTOR_RESOURCE.COURSE),
    addNoteLecture: makeAddLecture(TUTOR_RESOURCE.NOTE),
    deleteLecture,
    reindexCourse: makeReindex(TUTOR_RESOURCE.COURSE),
    reindexNote: makeReindex(TUTOR_RESOURCE.NOTE),
  };
}
