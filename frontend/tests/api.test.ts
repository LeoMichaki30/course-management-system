import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError, request, translateError } from "../src/api.ts";

test("API client follows JSON contracts, translates conflicts and handles 204", async () => {
  const originalFetch = globalThis.fetch;
  const calls: { path: string; method?: string; body?: string | null }[] = [];
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ path: String(url), method: options?.method, body: options?.body as string });
      if (options?.method === "DELETE") return new Response(null, { status: 204 });
      if (options?.method === "PUT") return Response.json({ error: "A course with this code already exists." }, { status: 409 });
      return Response.json({ user_id: "9223372036854775807", content_id: "2", watched_at: "2026-10-01T10:00:00Z" }, { status: 201 });
    };
    const result = await request<{ user_id: string }>("/content-views", { method: "POST", body: { user_id: "9223372036854775807", content_id: "2" } });
    assert.equal(result.user_id, "9223372036854775807");
    assert.deepEqual(JSON.parse(calls[0].body!), { user_id: "9223372036854775807", content_id: "2" });
    assert.equal(await request("/courses/1", { method: "DELETE" }), undefined);
    await assert.rejects(request("/courses/1", { method: "PUT", body: {} }), error => error instanceof ApiError && error.status === 409 && error.message.includes("código"));
    assert.match(calls[0].path, /\/content-views$/);
  } finally { globalThis.fetch = originalFetch; }
});

test("network failures do not retry writes and unknown server messages stay private", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => { calls++; throw new Error("Private connection details"); };
    await assert.rejects(request("/users", { method: "POST", body: {} }), error => error instanceof ApiError && error.message.includes("Consulte a lista"));
    assert.equal(calls, 1);
    assert.equal(translateError(500, "private data"), "Não foi possível concluir a solicitação. Tente novamente em instantes.");
    assert.match(translateError(409, "This user has already viewed this content."), /data original/);
    assert.match(translateError(409, "Cannot delete a module linked to contents."), /conteúdos/);
  } finally { globalThis.fetch = originalFetch; }
});
