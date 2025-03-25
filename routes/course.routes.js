import { Router } from 'express';
import { createCourse,updateCourse,deleteCourse,getCourses,courseDetails } from '../controller/course.controller.js';
const router = Router();

router.post("/create",createCourse);
router.put("/update/:courseId",updateCourse);
router.delete("/delete/:courseId",deleteCourse);
router.get("/courses", getCourses);
router.get("/:courseId", courseDetails);

export default router;