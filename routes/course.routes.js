import { Router } from 'express';
import { createCourse } from '../controller/course.controller.js';
const router = Router();

router.post("/create",createCourse);

export default router;