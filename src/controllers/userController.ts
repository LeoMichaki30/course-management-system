import type { Request, Response } from "express";
import type { CreateUserInput, UpdateUserInput } from "../models/userModel";
import * as userRepository from "../repositories/userRepository";

function getUserId(req: Request, res: Response): string | null {
  const id = req.params.id;

  if (typeof id !== "string" || !/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) {
    res.status(400).json({ error: "User ID must be a positive BIGINT integer." });
    return null;
  }

  return id;
}

function validateUserInput(body: unknown, requireStatus: boolean): string | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }

  const input = body as Record<string, unknown>;
  const allowedFields = ["name", "email", "status"];

  if (Object.keys(input).some((key) => !allowedFields.includes(key))) {
    return "Only name, email, and status can be provided.";
  }

  if (typeof input.name !== "string" || input.name.trim() === "") {
    return "Name must be a non-empty string.";
  }

  if (typeof input.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return "Email must be a valid email address.";
  }

  if ((requireStatus || input.status !== undefined) && input.status !== "active" && input.status !== "inactive") {
    return "Status must be active or inactive.";
  }

  return null;
}

function handleUserError(error: unknown, res: Response): void {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;

  if (code === "23505") {
    res.status(409).json({ error: "A user with this email already exists." });
  } else if (code === "23503") {
    res.status(409).json({ error: "Cannot delete a user linked to courses or modules." });
  } else if (code === "23502" || code === "23514" || code === "22P02") {
    res.status(400).json({ error: "User data does not satisfy database constraints." });
  } else {
    res.status(500).json({ error: "Unable to complete the user operation." });
  }
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json(await userRepository.findAllUsers());
  } catch (error) {
    handleUserError(error, res);
  }
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const id = getUserId(req, res);
  if (id === null) return;

  try {
    const user = await userRepository.findUserById(id);
    if (user === null) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    res.status(200).json(user);
  } catch (error) {
    handleUserError(error, res);
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const validationError = validateUserInput(req.body, false);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const body = req.body as CreateUserInput;
  const input: CreateUserInput = {
    name: body.name.trim(),
    email: body.email.trim().toLowerCase(),
    status: body.status ?? "active"
  };

  try {
    const user = await userRepository.createUser(input);
    res.location(`/users/${user.id}`).status(201).json(user);
  } catch (error) {
    handleUserError(error, res);
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const id = getUserId(req, res);
  if (id === null) return;

  const validationError = validateUserInput(req.body, true);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const body = req.body as UpdateUserInput;
  const input: UpdateUserInput = {
    name: body.name.trim(),
    email: body.email.trim().toLowerCase(),
    status: body.status
  };

  try {
    const user = await userRepository.updateUser(id, input);
    if (user === null) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    res.status(200).json(user);
  } catch (error) {
    handleUserError(error, res);
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const id = getUserId(req, res);
  if (id === null) return;

  try {
    if (!await userRepository.deleteUser(id)) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    handleUserError(error, res);
  }
}
