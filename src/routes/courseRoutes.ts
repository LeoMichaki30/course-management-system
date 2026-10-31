import { Router } from "express";
import * as courseController from "../controllers/courseController";

const courseRoutes = Router();

courseRoutes.get("/", courseController.listCourses);
courseRoutes.get("/:id", courseController.getCourse);
courseRoutes.post("/", courseController.createCourse);
courseRoutes.put("/:id", courseController.updateCourse);
courseRoutes.delete("/:id", courseController.deleteCourse);

export default courseRoutes;
