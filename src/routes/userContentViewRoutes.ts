import { Router } from "express";
import * as userContentViewController from "../controllers/userContentViewController";

const userContentViewRoutes = Router();

userContentViewRoutes.post("/", userContentViewController.createUserContentView);
userContentViewRoutes.get("/users/:userId", userContentViewController.listUserContentViews);
userContentViewRoutes.get("/contents/:contentId", userContentViewController.listContentViews);

export default userContentViewRoutes;
