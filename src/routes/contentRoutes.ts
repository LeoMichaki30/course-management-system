import { Router } from "express";
import * as contentController from "../controllers/contentController";

const contentRoutes = Router();

contentRoutes.get("/", contentController.listContents);
contentRoutes.get("/:id", contentController.getContent);
contentRoutes.post("/", contentController.createContent);
contentRoutes.put("/:id", contentController.updateContent);
contentRoutes.delete("/:id", contentController.deleteContent);

export default contentRoutes;
