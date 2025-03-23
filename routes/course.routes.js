import { Router } from 'express';
import { createCourse,updateCourse } from '../controller/course.controller.js';
const router = Router();

router.post("/create",createCourse);
router.put("/update/:courseId",updateCourse);

export default router;