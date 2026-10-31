import type { Request, Response } from "express";
import type { CreateUserContentViewInput } from "../models/userContentViewModel";
import * as userContentViewRepository from "../repositories/userContentViewRepository";
import * as userRepository from "../repositories/userRepository";
import * as contentRepository from "../repositories/contentRepository";

function isValidId(value: unknown): value is string {
  return typeof value === "string" && /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n;
}

function isValidTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
  if (match === null) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12) return false;

  // Date.parse can normalize impossible dates, so validate the calendar separately.
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysPerMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= daysPerMonth[month - 1] && Number.isFinite(Date.parse(value));
}

function validateViewInput(body: unknown): string | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }

  const input = body as Record<string, unknown>;
  const allowedFields = ["user_id", "content_id", "watched_at"];
  if (Object.keys(input).some((key) => !allowedFields.includes(key))) {
    return "Only user_id, content_id, and watched_at can be provided.";
  }
  if (!isValidId(input.user_id)) return "User ID must be a positive BIGINT integer string.";
  if (!isValidId(input.content_id)) return "Content ID must be a positive BIGINT integer string.";
  if (input.watched_at !== undefined && !isValidTimestamp(input.watched_at)) {
    return "Watched time must be a valid ISO 8601 timestamp with an explicit time zone.";
  }
  return null;
}

function handleViewError(error: unknown, res: Response, operation: "read" | "write"): void {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;

  if (code === "23505" && operation === "write") {
    res.status(409).json({ error: "This user has already viewed this content." });
  } else if (code === "23503" && operation === "write") {
    res.status(409).json({ error: "The specified user or content does not exist." });
  } else if (["23502", "23514", "22P02", "22007", "22008"].includes(String(code))) {
    res.status(400).json({ error: "Content view data does not satisfy database constraints." });
  } else {
    res.status(500).json({ error: "Unable to complete the content view operation." });
  }
}

export async function createUserContentView(req: Request, res: Response): Promise<void> {
  const validationError = validateViewInput(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const body = req.body as CreateUserContentViewInput;
  const input: CreateUserContentViewInput = { user_id: body.user_id, content_id: body.content_id };
  if (body.watched_at !== undefined) input.watched_at = body.watched_at;

  try {
    res.status(201).json(await userContentViewRepository.createUserContentView(input));
  } catch (error) {
    handleViewError(error, res, "write");
  }
}

export async function listUserContentViews(req: Request, res: Response): Promise<void> {
  const id = req.params.userId;
  if (!isValidId(id)) {
    res.status(400).json({ error: "User ID must be a positive BIGINT integer." });
    return;
  }

  try {
    if (await userRepository.findUserById(id) === null) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    res.status(200).json(await userContentViewRepository.findViewsByUserId(id));
  } catch (error) {
    handleViewError(error, res, "read");
  }
}

export async function listContentViews(req: Request, res: Response): Promise<void> {
  const id = req.params.contentId;
  if (!isValidId(id)) {
    res.status(400).json({ error: "Content ID must be a positive BIGINT integer." });
    return;
  }

  try {
    if (await contentRepository.findContentById(id) === null) {
      res.status(404).json({ error: "Content not found." });
      return;
    }
    res.status(200).json(await userContentViewRepository.findViewsByContentId(id));
  } catch (error) {
    handleViewError(error, res, "read");
  }
}
