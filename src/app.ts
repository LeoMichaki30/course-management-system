import express from "express";
import type { ErrorRequestHandler } from "express";
import userRoutes from "./routes/userRoutes";
import courseRoutes from "./routes/courseRoutes";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Course Management System API",
    version: "1.0.0"
  });
});

app.use("/users", userRoutes);
app.use("/courses", courseRoutes);

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
