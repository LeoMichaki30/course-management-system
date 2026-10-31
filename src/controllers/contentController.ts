import type { Request, Response } from "express";
import type { CreateContentInput, UpdateContentInput } from "../models/contentModel";
import * as contentRepository from "../repositories/contentRepository";

function getContentId(req: Request, res: Response): string | null {
  const id = req.params.id;

  if (!isValidId(id)) {
    res.status(400).json({ error: "Content ID must be a positive BIGINT integer." });
    return null;
  }

  return id;
}

function isValidId(value: unknown): value is string {
  return typeof value === "string" && /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n;
}

function validateContentInput(body: unknown): string | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }

  const input = body as Record<string, unknown>;
  const allowedFields = ["module_id", "title", "content"];

  if (Object.keys(input).some((key) => !allowedFields.includes(key))) {
    return "Only module_id, title, and content can be provided.";
  }

  if (!isValidId(input.module_id)) {
    return "Module ID must be a positive BIGINT integer string.";
  }

  if (typeof input.title !== "string" || input.title.trim() === "") {
    return "Title must be a non-empty string.";
  }

  if (typeof input.content !== "string" || input.content.trim() === "") {
    return "Content must be a non-empty string.";
  }

  return null;
}

function handleContentError(error: unknown, res: Response, operation: "read" | "write" | "delete"): void {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;

  if (code === "23503" && operation === "write") {
    res.status(409).json({ error: "The specified module does not exist." });
  } else if (code === "23502" || code === "23514" || code === "22P02") {
    res.status(400).json({ error: "Content data does not satisfy database constraints." });
  } else {
    res.status(500).json({ error: "Unable to complete the content operation." });
  }
}

export async function listContents(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json(await contentRepository.findAllContents());
  } catch (error) {
    handleContentError(error, res, "read");
  }
}

export async function getContent(req: Request, res: Response): Promise<void> {
  const id = getContentId(req, res);
  if (id === null) return;

  try {
    const content = await contentRepository.findContentById(id);
    if (content === null) {
      res.status(404).json({ error: "Content not found." });
      return;
    }
    res.status(200).json(content);
  } catch (error) {
    handleContentError(error, res, "read");
  }
}

export async function createContent(req: Request, res: Response): Promise<void> {
  const validationError = validateContentInput(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const body = req.body as CreateContentInput;
  const input: CreateContentInput = {
    module_id: body.module_id,
    title: body.title.trim(),
    content: body.content
  };

  try {
    const content = await contentRepository.createContent(input);
    res.location(`/contents/${content.id}`).status(201).json(content);
  } catch (error) {
    handleContentError(error, res, "write");
  }
}

export async function updateContent(req: Request, res: Response): Promise<void> {
  const id = getContentId(req, res);
  if (id === null) return;

  const validationError = validateContentInput(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const body = req.body as UpdateContentInput;
  const input: UpdateContentInput = {
    module_id: body.module_id,
    title: body.title.trim(),
    content: body.content
  };

  try {
    const content = await contentRepository.updateContent(id, input);
    if (content === null) {
      res.status(404).json({ error: "Content not found." });
      return;
    }
    res.status(200).json(content);
  } catch (error) {
    handleContentError(error, res, "write");
  }
}

export async function deleteContent(req: Request, res: Response): Promise<void> {
  const id = getContentId(req, res);
  if (id === null) return;

  try {
    if (!await contentRepository.deleteContent(id)) {
      res.status(404).json({ error: "Content not found." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    handleContentError(error, res, "delete");
  }
}
