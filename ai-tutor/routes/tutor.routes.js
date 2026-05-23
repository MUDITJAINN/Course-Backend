import { Router } from "express";
import userMiddleware from "../../middlewares/user.mid.js";
import adminMiddleware from "../../middlewares/admin.mid.js";
import { requireTutorAccess } from "../middleware/requireTutorAccess.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { TUTOR_RESOURCE } from "../utils/tutorResource.js";

export function createTutorRouter({ tutorController, adminController, rateLimitPerMinute }) {
  const router = Router();
  const limiter = createRateLimiter(rateLimitPerMinute);
  const courseAccess = requireTutorAccess(TUTOR_RESOURCE.COURSE);
  const noteAccess = requireTutorAccess(TUTOR_RESOURCE.NOTE);

  router.get("/status", tutorController.getStatus);

  // Courses (when sales are enabled)
  router.get(
    "/courses/:courseId/lectures",
    userMiddleware,
    courseAccess,
    tutorController.getCourseLectures
  );
  router.get(
    "/courses/:courseId/session",
    userMiddleware,
    courseAccess,
    tutorController.getCourseSession
  );
  router.post(
    "/courses/:courseId/session/new",
    userMiddleware,
    courseAccess,
    limiter,
    tutorController.postCourseNewSession
  );
  router.post(
    "/courses/:courseId/chat/stream",
    userMiddleware,
    courseAccess,
    limiter,
    tutorController.postCourseChatStream
  );

  // Notes (active product)
  router.get(
    "/notes/:noteId/lectures",
    userMiddleware,
    noteAccess,
    tutorController.getNoteLectures
  );
  router.get(
    "/notes/:noteId/session",
    userMiddleware,
    noteAccess,
    tutorController.getNoteSession
  );
  router.post(
    "/notes/:noteId/session/new",
    userMiddleware,
    noteAccess,
    limiter,
    tutorController.postNoteNewSession
  );
  router.post(
    "/notes/:noteId/chat/stream",
    userMiddleware,
    noteAccess,
    limiter,
    tutorController.postNoteChatStream
  );

  // Admin — courses
  router.get(
    "/admin/courses/:courseId/lectures",
    adminMiddleware,
    adminController.listCourseLectures
  );
  router.post(
    "/admin/courses/:courseId/lectures",
    adminMiddleware,
    adminController.addCourseLecture
  );
  router.post(
    "/admin/courses/:courseId/reindex",
    adminMiddleware,
    adminController.reindexCourse
  );

  // Admin — notes
  router.get(
    "/admin/notes/:noteId/rag-prep",
    adminMiddleware,
    adminController.getNoteRagPrep
  );

  router.get(
    "/admin/notes/:noteId/lectures",
    adminMiddleware,
    adminController.listNoteLectures
  );
  router.post(
    "/admin/notes/:noteId/lectures",
    adminMiddleware,
    adminController.addNoteLecture
  );
  router.post(
    "/admin/notes/:noteId/reindex",
    adminMiddleware,
    adminController.reindexNote
  );

  router.delete(
    "/admin/lectures/:lectureId",
    adminMiddleware,
    adminController.deleteLecture
  );

  return router;
}
