import { Router } from "express";
import * as moduleController from "../controllers/moduleController";

const moduleRoutes = Router();

moduleRoutes.get("/", moduleController.listModules);
moduleRoutes.get("/:id", moduleController.getModule);
moduleRoutes.post("/", moduleController.createModule);
moduleRoutes.put("/:id", moduleController.updateModule);
moduleRoutes.delete("/:id", moduleController.deleteModule);

export default moduleRoutes;
