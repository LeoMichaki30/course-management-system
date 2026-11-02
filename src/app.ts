import express from "express";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./docs/openapi";
import { localCors } from "./middleware/localCors";
import type { ErrorRequestHandler } from "express";
import userRoutes from "./routes/userRoutes";
import courseRoutes from "./routes/courseRoutes";
import moduleRoutes from "./routes/moduleRoutes";
import contentRoutes from "./routes/contentRoutes";
import userContentViewRoutes from "./routes/userContentViewRoutes";

const app = express();

app.use(localCors);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Course Management System API",
    version: "1.0.0"
  });
});

app.get("/api-docs.json", (req, res) => {
  res.json(openApiDocument);
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(undefined, {
  customSiteTitle: "Course Management System API Docs",
  swaggerOptions: { url: "/api-docs.json", validatorUrl: null }
}));

app.use("/users", userRoutes);
app.use("/courses", courseRoutes);
app.use("/modules", moduleRoutes);
app.use("/contents", contentRoutes);
app.use("/content-views", userContentViewRoutes);

const handleRequestError: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof SyntaxError && "type" in error && error.type === "entity.parse.failed") {
    res.status(400).json({ error: "Request body must contain valid JSON." });
    return;
  }

  if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large") {
    res.status(413).json({ error: "Request body is too large." });
    return;
  }

  res.status(500).json({ error: "Unable to process the request." });
};

app.use(handleRequestError);

export default app;
