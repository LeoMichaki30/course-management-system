import type { Entity, EntityRecord, Values } from "./types";

export function initialValues(record?: EntityRecord): Values {
  if (!record) return { name: "", email: "", status: "active", user_id: "", course_id: "", module_id: "", code: "", title: "", description: "", content: "" };
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, value ?? ""]));
}

export function buildPayload(entity: Entity, values: Values) {
  if (entity === "users") return { name: values.name.trim(), email: values.email.trim().toLowerCase(), status: values.status };
  if (entity === "courses") return { user_id: values.user_id, code: values.code.trim(), title: values.title.trim(), description: values.description?.trim() || null };
  if (entity === "modules") return { course_id: values.course_id, user_id: values.user_id, title: values.title.trim(), description: values.description?.trim() || null };
  return { module_id: values.module_id, title: values.title.trim(), content: values.content };
}

export function validateValues(entity: Entity, values: Values): string | null {
  const fields = entity === "users" ? ["name", "email"] : entity === "courses" ? ["code", "title"] : entity === "modules" ? ["title"] : ["title", "content"];
  if (fields.some(key => !values[key]?.trim())) return "Preencha os campos obrigatórios com texto válido.";
  if (entity === "users" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return "Informe um e-mail válido.";
  const idFields = entity === "courses" ? ["user_id"] : entity === "modules" ? ["course_id", "user_id"] : entity === "contents" ? ["module_id"] : [];
  if (idFields.some(key => !/^[1-9]\d{0,18}$/.test(values[key] ?? "") || BigInt(values[key]) > 9223372036854775807n)) return "Selecione os registros vinculados para continuar.";
  return null;
}
