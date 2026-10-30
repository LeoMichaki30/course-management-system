import express from "express";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Course Management System API",
    version: "1.0.0"
  });
});

export default app;