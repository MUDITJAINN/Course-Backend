import { Purchase } from "../../models/purchase.model.js";

export function requireCoursePurchase() {
  return async (req, res, next) => {
    try {
      const { courseId } = req.params;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Login required" });
      }

      const purchase = await Purchase.findOne({
        userId,
        courseId,
        $nor: [{ status: "PENDING" }, { status: "FAILED" }],
      });

      if (!purchase) {
        return res.status(403).json({
          success: false,
          message: "Purchase this course to use the AI tutor.",
        });
      }

      next();
    } catch (error) {
      console.error("[ai-tutor] requireCoursePurchase", error.message);
      return res.status(500).json({ success: false, message: "Could not verify purchase" });
    }
  };
}
