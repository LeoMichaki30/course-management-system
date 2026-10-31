import type { Request, Response } from "express";
import type { CreateCourseInput, UpdateCourseInput } from "../models/courseModel";
import * as courseRepository from "../repositories/courseRepository";

function getCourseId(req: Request, res: Response): string | null {
  const id = req.params.id;

  if (!isValidId(id)) {
    res.status(400).json({ error: "Course ID must be a positive BIGINT integer." });
    return null;
  }

  return id;
}

function isValidId(value: unknown): value is string {
  return typeof value === "string" && /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n;
}

function validateCourseInput(body: unknown, requireDescription: boolean): string | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }

  const input = body as Record<string, unknown>;
  const allowedFields = ["user_id", "code", "title", "description"];

  if (Object.keys(input).some((key) => !allowedFields.includes(key))) {
    return "Only user_id, code, title, and description can be provided.";
  }

  if (!isValidId(input.user_id)) {
    return "User ID must be a positive BIGINT integer string.";
  }

  if (typeof input.code !== "string" || input.code.trim() === "") {
    return "Code must be a non-empty string.";
  }

  if (typeof input.title !== "string" || input.title.trim() === "") {
    return "Title must be a non-empty string.";
  }

  if ((requireDescription || input.description !== undefined) && input.description !== null && typeof input.description !== "string") {
    return "Description must be a string or null.";
  }

  return null;
}

function handleCourseError(error: unknown, res: Response, operation: "read" | "write" | "delete"): void {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;

  if (code === "23505") {
    res.status(409).json({ error: "A course with this code already exists." });
  } else if (code === "23503" && operation === "write") {
    res.status(409).json({ error: "The specified user does not exist." });
  } else if (code === "23503" && operation === "delete") {
    res.status(409).json({ error: "Cannot delete a course linked to modules." });
  } else if (code === "23502" || code === "23514" || code === "22P02") {
    res.status(400).json({ error: "Course data does not satisfy database constraints." });
  } else {
    res.status(500).json({ error: "Unable to complete the course operation." });
  }
}

export async function listCourses(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json(await courseRepository.findAllCourses());
  } catch (error) {
    handleCourseError(error, res, "read");
  }
}

export async function getCourse(req: Request, res: Response): Promise<void> {
  const id = getCourseId(req, res);
  if (id === null) return;

  try {
    const course = await courseRepository.findCourseById(id);
    if (course === null) {
      res.status(404).json({ error: "Course not found." });
      return;
    }
    res.status(200).json(course);
  } catch (error) {
    handleCourseError(error, res, "read");
  }
}

export async function createCourse(req: Request, res: Response): Promise<void> {
  const validationError = validateCourseInput(req.body, false);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const body = req.body as CreateCourseInput;
  const input: CreateCourseInput = {
    user_id: body.user_id,
    code: body.code.trim(),
    title: body.title.trim(),
    description: body.description?.trim() ?? null
  };

  try {
    const course = await courseRepository.createCourse(input);
    res.location(`/courses/${course.id}`).status(201).json(course);
  } catch (error) {
    handleCourseError(error, res, "write");
  }
}

export async function updateCourse(req: Request, res: Response): Promise<void> {
  const id = getCourseId(req, res);
  if (id === null) return;

  const validationError = validateCourseInput(req.body, true);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const body = req.body as UpdateCourseInput;
  const input: UpdateCourseInput = {
    user_id: body.user_id,
    code: body.code.trim(),
    title: body.title.trim(),
    description: body.description?.trim() ?? null
  };

  try {
    const course = await courseRepository.updateCourse(id, input);
    if (course === null) {
      res.status(404).json({ error: "Course not found." });
      return;
    }
    res.status(200).json(course);
  } catch (error) {
    handleCourseError(error, res, "write");
  }
}

export async function deleteCourse(req: Request, res: Response): Promise<void> {
  const id = getCourseId(req, res);
  if (id === null) return;

  try {
    if (!await courseRepository.deleteCourse(id)) {
      res.status(404).json({ error: "Course not found." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    handleCourseError(error, res, "delete");
  }
}
