import { Purchase } from "../../models/purchase.model.js";
import { NotePurchase } from "../../models/notePurchase.model.js";
import { TUTOR_RESOURCE } from "../utils/tutorResource.js";

export function requireTutorAccess(resourceType) {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Login required" });
      }

      const resourceId =
        resourceType === TUTOR_RESOURCE.NOTE ? req.params.noteId : req.params.courseId;

      if (resourceType === TUTOR_RESOURCE.NOTE) {
        const purchase = await NotePurchase.findOne({
          userId,
          noteId: resourceId,
          status: "SUCCESS",
        });
        if (!purchase) {
          return res.status(403).json({
            success: false,
            message: "Purchase this note to use the AI tutor.",
          });
        }
      } else {
        const purchase = await Purchase.findOne({
          userId,
          courseId: resourceId,
          $nor: [{ status: "PENDING" }, { status: "FAILED" }],
        });
        if (!purchase) {
          return res.status(403).json({
            success: false,
            message: "Purchase this course to use the AI tutor.",
          });
        }
      }

      req.tutorResourceType = resourceType;
      req.tutorResourceId = resourceId;
      next();
    } catch (error) {
      console.error("[ai-tutor] requireTutorAccess", error.message);
      return res.status(500).json({ success: false, message: "Could not verify access" });
    }
  };
}
