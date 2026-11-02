import type { User } from "../../src/models/userModel";
import type { Course } from "../../src/models/courseModel";
import type { Module } from "../../src/models/moduleModel";
import type { Content } from "../../src/models/contentModel";
export type { UserContentView } from "../../src/models/userContentViewModel";

export interface EntityMap {
  users: User;
  courses: Course;
  modules: Module;
  contents: Content;
}
export type Entity = keyof EntityMap;
export type EntityRecord = EntityMap[Entity];
export type Catalog = { [K in Entity]: EntityMap[K][] };
export type Page = "dashboard" | Entity | "views";
export type Values = Record<string, string>;
export const entities: Entity[] = ["users", "courses", "modules", "contents"];
export const pageLabels: Record<Page, string> = {
  dashboard: "Visão geral", users: "Usuários", courses: "Cursos", modules: "Módulos", contents: "Conteúdos", views: "Visualizações"
};
export const singularLabels: Record<Entity, string> = { users: "usuário", courses: "curso", modules: "módulo", contents: "conteúdo" };
export const emptyCatalog: Catalog = { users: [], courses: [], modules: [], contents: [] };

export function recordLabel(record: EntityRecord): string {
  return "name" in record ? record.name : record.title;
}
export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}
