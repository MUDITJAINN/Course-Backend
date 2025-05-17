import { Router } from 'express';
import { buyCourses,createCourse,updateCourse,deleteCourse,getCourses,courseDetails, } from '../controller/course.controller.js';
const router = Router();
import userMiddleware from "../middlewares/user.mid.js";
import adminMiddleware from '../middlewares/admin.mid.js';

router.post("/create",adminMiddleware, createCourse);
router.put("/update/:courseId",adminMiddleware, updateCourse);
router.delete("/delete/:courseId",adminMiddleware, deleteCourse);
router.get("/courses", getCourses);
router.get("/:courseId", courseDetails);
router.post("/buy/:courseId", userMiddleware, buyCourses);

export default router;