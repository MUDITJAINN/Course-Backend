import { Router } from "express";
import {
  courseDetails,
  createCourse,
  createCoursePayment,
  deleteCourse,
  getCourses,
  updateCourse,
  verifyCoursePayment,
} from "../controller/course.controller.js";
const router = Router();
import userMiddleware from "../middlewares/user.mid.js";
import adminMiddleware from "../middlewares/admin.mid.js";

router.post("/create", adminMiddleware, createCourse);
router.put("/update/:courseId", adminMiddleware, updateCourse);
router.delete("/delete/:courseId", adminMiddleware, deleteCourse);
router.get("/courses", getCourses);
router.post("/create-payment/:courseId", userMiddleware, createCoursePayment);
router.get("/verify-payment", userMiddleware, verifyCoursePayment);
router.get("/:courseId", courseDetails);

export default router;