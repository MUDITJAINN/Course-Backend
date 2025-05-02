import { Router } from 'express';
import { buyCourses,createCourse,updateCourse,deleteCourse,getCourses,courseDetails, } from '../controller/course.controller.js';
const router = Router();
import userMiddleware from "../middlewares/user.mid.js";

router.post("/create",createCourse);
router.put("/update/:courseId",updateCourse);
router.delete("/delete/:courseId",deleteCourse);
router.get("/courses", getCourses);
router.get("/:courseId", courseDetails);

router.post("/buy/:courseId", userMiddleware, buyCourses);

export default router;