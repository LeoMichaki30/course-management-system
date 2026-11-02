// Disposable, memory-only API for UI verification. Never imports the Supabase client.
import { createServer } from "node:http";
import type { Entity, EntityRecord, UserContentView } from "../src/types.ts";

const timestamp = "2026-10-30T12:00:00Z";
const dates = { created_at: timestamp, updated_at: timestamp };
const data: Record<Entity, EntityRecord[]> = {
  users: ["Alice Morgan", "Benjamin Carter", "Chloe Reed", "Daniel Brooks", "Emma Wilson"].map((name, index) => ({ ...dates, id: String(index + 1), name, email: `${name.split(" ")[0].toLowerCase()}@example.com`, status: index === 4 ? "inactive" : "active" })),
  courses: ["Desenvolvimento Web", "Fundamentos de Banco de Dados", "Engenharia de Software"].map((title, index) => ({ ...dates, id: String(index + 1), user_id: index === 2 ? "2" : "1", code: `COURSE-00${index + 1}`, title, description: "Uma jornada de conhecimento, um passo de cada vez." })),
  modules: ["HTML e estrutura", "CSS e interfaces", "JavaScript", "TypeScript", "Express", "Modelagem relacional", "Consultas SQL", "Integridade de dados", "Design de software", "Testes"].map((title, index) => ({ ...dates, id: String(index + 1), course_id: index < 5 ? "1" : index < 8 ? "2" : "3", user_id: "1", title, description: null })),
  contents: Array.from({ length: 14 }, (_, index) => ({ ...dates, id: String(index + 1), module_id: String(index < 5 ? index + 1 : index < 10 ? 6 + Math.floor((index - 5) / 2) : 9 + Math.floor((index - 10) / 2)), title: ["Elementos semânticos", "Seletores e estilos", "Funções JavaScript", "Tipos e interfaces", "Rotas Express"][index % 5], content: "  # Material didático\n\n  Texto formatado para aprendizagem.\n" }))
};
const views: UserContentView[] = [{ user_id: "1", content_id: "2", watched_at: timestamp }];
let nextId = 9007199254740993n;

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
  const send = (status: number, payload?: unknown) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(payload === undefined ? undefined : JSON.stringify(payload)); };
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    const [resource, id, filterId] = new URL(req.url ?? "/", "http://localhost").pathname.split("/").filter(Boolean);
    if (resource === "content-views") {
      if (req.method === "POST") {
        if (views.some(view => view.user_id === body.user_id && view.content_id === body.content_id)) { send(409, { error: "This user has already viewed this content." }); return; }
        const record = { ...body, watched_at: body.watched_at ?? new Date().toISOString() };
        views.push(record); send(201, record); return;
      }
      send(200, views.filter(view => id === "users" ? view.user_id === filterId : view.content_id === filterId)); return;
    }
    if (!(resource in data)) { send(404, { error: "Not found." }); return; }
    const entity = resource as Entity;
    if (req.method === "GET") { send(200, id ? data[entity].find(record => record.id === id) : data[entity]); return; }
    if (req.method === "POST") {
      const record = { ...body, id: String(nextId++), ...dates };
      data[entity].push(record); send(201, record); return;
    }
    if (req.method === "PUT") {
      const index = data[entity].findIndex(record => record.id === id);
      if (index === -1) { send(404, { error: "Not found." }); return; }
      data[entity][index] = { ...data[entity][index], ...body }; send(200, data[entity][index]); return;
    }
    if (req.method === "DELETE") {
      if (entity === "courses" && data.modules.some(record => "course_id" in record && record.course_id === id)) { send(409, { error: "Cannot delete a course linked to modules." }); return; }
      if (entity === "modules" && data.contents.some(record => "module_id" in record && record.module_id === id)) { send(409, { error: "Cannot delete a module linked to contents." }); return; }
      if (entity === "users" && [...data.courses, ...data.modules].some(record => "user_id" in record && record.user_id === id)) { send(409, { error: "Cannot delete a user linked to courses or modules." }); return; }
      data[entity] = data[entity].filter(record => record.id !== id); send(204); return;
    }
    send(405, { error: "Method not allowed." });
  } catch { send(400, { error: "Invalid request." }); }
});
server.listen(3009, "127.0.0.1", () => console.log("Memory-only mock API: http://127.0.0.1:3009"));
