import { Router } from 'express';
import { createCourse,updateCourse,deleteCourse } from '../controller/course.controller.js';
const router = Router();

router.post("/create",createCourse);
router.put("/update/:courseId",updateCourse);
router.delete("/delete/:courseId",deleteCourse);

export default router;