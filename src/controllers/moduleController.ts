import type { Request, Response } from "express";
import type { CreateModuleInput, UpdateModuleInput } from "../models/moduleModel";
import * as moduleRepository from "../repositories/moduleRepository";

function getModuleId(req: Request, res: Response): string | null {
  const id = req.params.id;

  if (!isValidId(id)) {
    res.status(400).json({ error: "Module ID must be a positive BIGINT integer." });
    return null;
  }

  return id;
}

function isValidId(value: unknown): value is string {
  return typeof value === "string" && /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n;
}

function validateModuleInput(body: unknown, requireDescription: boolean): string | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }

  const input = body as Record<string, unknown>;
  const allowedFields = ["course_id", "user_id", "title", "description"];

  if (Object.keys(input).some((key) => !allowedFields.includes(key))) {
    return "Only course_id, user_id, title, and description can be provided.";
  }

  if (!isValidId(input.user_id)) {
    return "User ID must be a positive BIGINT integer string.";
  }

  if (!isValidId(input.course_id)) {
    return "Course ID must be a positive BIGINT integer string.";
  }

  if (typeof input.title !== "string" || input.title.trim() === "") {
    return "Title must be a non-empty string.";
  }

  if ((requireDescription || input.description !== undefined) && input.description !== null && typeof input.description !== "string") {
    return "Description must be a string or null.";
  }

  return null;
}

function handleModuleError(error: unknown, res: Response, operation: "read" | "write" | "delete"): void {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;

  if (code === "23503" && operation === "write") {
    res.status(409).json({ error: "The specified course or user does not exist." });
  } else if (code === "23503" && operation === "delete") {
    res.status(409).json({ error: "Cannot delete a module linked to contents." });
  } else if (code === "23502" || code === "23514" || code === "22P02") {
    res.status(400).json({ error: "Module data does not satisfy database constraints." });
  } else {
    res.status(500).json({ error: "Unable to complete the module operation." });
  }
}

export async function listModules(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json(await moduleRepository.findAllModules());
  } catch (error) {
    handleModuleError(error, res, "read");
  }
}

export async function getModule(req: Request, res: Response): Promise<void> {
  const id = getModuleId(req, res);
  if (id === null) return;

  try {
    const module = await moduleRepository.findModuleById(id);
    if (module === null) {
      res.status(404).json({ error: "Module not found." });
      return;
    }
    res.status(200).json(module);
  } catch (error) {
    handleModuleError(error, res, "read");
  }
}

export async function createModule(req: Request, res: Response): Promise<void> {
  const validationError = validateModuleInput(req.body, false);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const body = req.body as CreateModuleInput;
  const input: CreateModuleInput = {
    user_id: body.user_id,
    course_id: body.course_id,
    title: body.title.trim(),
    description: body.description?.trim() ?? null
  };

  try {
    const module = await moduleRepository.createModule(input);
    res.location(`/modules/${module.id}`).status(201).json(module);
  } catch (error) {
    handleModuleError(error, res, "write");
  }
}

export async function updateModule(req: Request, res: Response): Promise<void> {
  const id = getModuleId(req, res);
  if (id === null) return;

  const validationError = validateModuleInput(req.body, true);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const body = req.body as UpdateModuleInput;
  const input: UpdateModuleInput = {
    user_id: body.user_id,
    course_id: body.course_id,
    title: body.title.trim(),
    description: body.description?.trim() ?? null
  };

  try {
    const module = await moduleRepository.updateModule(id, input);
    if (module === null) {
      res.status(404).json({ error: "Module not found." });
      return;
    }
    res.status(200).json(module);
  } catch (error) {
    handleModuleError(error, res, "write");
  }
}

export async function deleteModule(req: Request, res: Response): Promise<void> {
  const id = getModuleId(req, res);
  if (id === null) return;

  try {
    if (!await moduleRepository.deleteModule(id)) {
      res.status(404).json({ error: "Module not found." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    handleModuleError(error, res, "delete");
  }
}
