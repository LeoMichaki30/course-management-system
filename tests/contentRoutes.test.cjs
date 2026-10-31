const assert = require("node:assert/strict");
const { once } = require("node:events");
const { test } = require("node:test");

test("contents endpoints with simulated Supabase responses", async (t) => {
  // Keep every database request inside this process, using placeholder credentials.
  process.env.SUPABASE_URL = "https://database.example.invalid";
  process.env.SUPABASE_SECRET_KEY = "test-server-key";
  process.env.DOTENV_CONFIG_PATH = "/nonexistent/course-management-test.env";
  process.env.DOTENV_CONFIG_QUIET = "true";

  const originalFetch = globalThis.fetch;
  const pendingResponses = [];
  let databaseCalls = 0;

  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://database.example.invalid");
    assert.equal(url.pathname, "/rest/v1/contents");
    const expected = pendingResponses.shift();
    assert.ok(expected, "Unexpected database request");
    databaseCalls++;
    assert.equal(options.method, expected.method);
    if (expected.id) assert.equal(url.searchParams.get("id"), `eq.${expected.id}`);
    if (expected.body) assert.deepEqual(JSON.parse(options.body), expected.body);
    if (expected.method === "GET" && !expected.id) {
      assert.equal(url.searchParams.get("order"), "id.asc");
    }
    if (expected.offset !== undefined) {
      assert.equal(url.searchParams.get("offset"), String(expected.offset));
    }
    assert.ok(url.searchParams.get("select").includes("id::text"));
    if (expected.method !== "DELETE") {
      assert.ok(url.searchParams.get("select").includes("module_id::text"));
    }
    if (expected.networkError) throw new Error("Simulated network failure with private details");
    return new Response(JSON.stringify(expected.data), {
      status: expected.status ?? 200,
      headers: {
        "Content-Type": "application/json",
        ...(expected.count !== undefined ? { "Content-Range": `0-0/${expected.count}` } : {})
      }
    });
  };

  const app = require("../src/app.ts").default;
  const server = app.listen(0, "127.0.0.1");
  t.after(async () => {
    globalThis.fetch = originalFetch;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const request = (path, method = "GET", body) => originalFetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const input = { module_id: "1", title: "Test Content", content: "Content text" };
  const contentRecord = {
    id: "1",
    ...input,
    created_at: "2026-10-31T00:00:00Z",
    updated_at: "2026-10-31T00:00:00Z"
  };

  await t.test("lists contents and handles an empty list", async () => {
    for (const data of [[contentRecord], []]) {
      pendingResponses.push({ method: "GET", data });
      const response = await request("/contents");
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), data);
    }
  });

  await t.test("lists all contents when database responses are capped", async () => {
    const secondContent = { ...contentRecord, id: "2" };
    pendingResponses.push(
      { method: "GET", offset: 0, count: 2, data: [contentRecord] },
      { method: "GET", offset: 1, count: 2, data: [secondContent] }
    );
    const response = await request("/contents");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [contentRecord, secondContent]);
  });

  await t.test("finds a content and returns 404 when missing", async () => {
    for (const [data, status] of [[[contentRecord], 200], [[], 404]]) {
      pendingResponses.push({ method: "GET", id: "1", data });
      const response = await request("/contents/1");
      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), status === 200 ? contentRecord : { error: "Content not found." });
    }
  });

  for (const [path, method, databaseMethod] of [["/contents", "POST", "POST"], ["/contents/1", "PUT", "PATCH"]]) {
    await t.test(`${method} preserves content formatting and trims only the title`, async () => {
      for (const text of ["  Leading and trailing spaces  ", "\n# Lesson\n\n  Indented text\n\tCode\r\n "]) {
        const body = { module_id: "2", title: "Updated Title", content: text };
        const record = { ...contentRecord, ...body };
        pendingResponses.push({ method: databaseMethod, id: method === "PUT" ? "1" : undefined, body, data: method === "POST" ? record : [record] });
        const response = await request(path, method, { ...body, title: "  Updated Title  " });
        assert.equal(response.status, method === "POST" ? 201 : 200);
        if (method === "POST") assert.equal(response.headers.get("location"), "/contents/1");
        assert.deepEqual(await response.json(), record);
      }
    });
  }

  await t.test("accepts repeated titles and text without arbitrary format or length limits", async () => {
    const body = { ...input, title: "Lesson / edition #1! " + "x".repeat(500), content: "x".repeat(5000) };
    for (const id of ["2", "3"]) {
      pendingResponses.push({ method: "POST", body, data: { ...contentRecord, ...body, id }, status: 201 });
      const response = await request("/contents", "POST", body);
      assert.equal(response.status, 201);
      assert.deepEqual(await response.json(), { ...contentRecord, ...body, id });
    }
  });

  await t.test("updating a missing content returns 404", async () => {
    pendingResponses.push({ method: "PATCH", id: "1", body: input, data: [] });
    const response = await request("/contents/1", "PUT", input);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Content not found." });
  });

  await t.test("deletes a content with no response body and handles missing contents", async () => {
    for (const [data, status] of [[[{ id: "1" }], 204], [[], 404]]) {
      pendingResponses.push({ method: "DELETE", id: "1", data });
      const response = await request("/contents/1", "DELETE");
      assert.equal(response.status, status);
      if (status === 204) assert.equal(await response.text(), "");
      else assert.deepEqual(await response.json(), { error: "Content not found." });
    }
  });

  for (const [method, path, databaseMethod] of [["POST", "/contents", "POST"], ["PUT", "/contents/1", "PATCH"]]) {
    await t.test(`${method} returns 409 for a nonexistent module without leaking details`, async () => {
      const body = { ...input, module_id: "999" };
      pendingResponses.push({ method: databaseMethod, id: method === "PUT" ? "1" : undefined, body, status: 409, data: { code: "23503", message: "Private violation of contents_module_id_fkey", details: "Private module data" } });
      const response = await request(path, method, body);
      assert.equal(response.status, 409);
      assert.deepEqual(await response.json(), { error: "The specified module does not exist." });
    });
  }

  await t.test("DELETE delegates cascade to the database without querying or deleting views", async () => {
    const callsBefore = databaseCalls;
    pendingResponses.push({ method: "DELETE", id: "1", data: [{ id: "1" }] });
    const response = await request("/contents/1", "DELETE");
    assert.equal(response.status, 204);
    assert.equal(await response.text(), "");
    assert.equal(databaseCalls, callsBefore + 1);
  });

  await t.test("rejects invalid route IDs without database access", async () => {
    const callsBefore = databaseCalls;
    for (const id of ["0", "01", "-1", "1.5", "abc", "1e3", "9223372036854775808", "99999999999999999999999"]) {
      for (const method of ["GET", "PUT", "DELETE"]) {
        const response = await request(`/contents/${id}`, method, method === "PUT" ? input : undefined);
        assert.equal(response.status, 400);
      }
    }
    assert.equal(databaseCalls, callsBefore);
  });

  await t.test("preserves content and module IDs beyond JavaScript's safe integer range", async () => {
    const id = "9223372036854775807";
    const largeContent = { ...contentRecord, id, module_id: id };
    pendingResponses.push({ method: "GET", id, data: [largeContent] });
    const found = await request(`/contents/${id}`);
    assert.equal(found.status, 200);
    assert.deepEqual(await found.json(), largeContent);
    for (const [path, method, databaseMethod] of [["/contents", "POST", "POST"], [`/contents/${id}`, "PUT", "PATCH"]]) {
      const body = { ...input, module_id: id };
      pendingResponses.push({ method: databaseMethod, body, data: method === "POST" ? largeContent : [largeContent] });
      const response = await request(path, method, body);
      assert.equal(response.status, method === "POST" ? 201 : 200);
      assert.deepEqual(await response.json(), largeContent);
    }
  });

  await t.test("rejects invalid and protected fields without database access", async () => {
    const callsBefore = databaseCalls;
    const invalidBodies = [
      {}, [], null,
      ...["module_id"].flatMap(key => [undefined, null, 1, 9007199254740992, "0", "01", "-1", "1.5", "1e3", "abc", "9223372036854775808"].map(value => ({ ...input, [key]: value }))),
      ...["title", "content"].flatMap(key => [undefined, null, 123, false, {}, [], "", "   ", "\n\t\r "].map(value => ({ ...input, [key]: value }))),
      ...["id", "description", "course_id", "user_id", "created_at", "updated_at", "extra"].map(key => ({ ...input, [key]: "untrusted" }))
    ];
    for (const [path, method] of [["/contents", "POST"], ["/contents/1", "PUT"]]) {
      for (const body of invalidBodies) {
        const response = await request(path, method, body);
        assert.equal(response.status, 400);
      }
    }
    assert.equal(databaseCalls, callsBefore);
  });

  await t.test("malformed and oversized JSON use the existing error middleware", async () => {
    const malformed = await originalFetch(`${baseUrl}/contents`, { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"title":' });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { error: "Request body must contain valid JSON." });
    const oversized = await request("/contents", "POST", { ...input, title: "x".repeat(110000) });
    assert.equal(oversized.status, 413);
    assert.deepEqual(await oversized.json(), { error: "Request body is too large." });
  });

  await t.test("database data constraint errors return safe 400 responses", async () => {
    for (const code of ["23502", "23514", "22P02"]) {
      for (const [path, method, databaseMethod] of [["/contents", "POST", "POST"], ["/contents/1", "PUT", "PATCH"]]) {
        pendingResponses.push({ method: databaseMethod, status: 400, data: { code, message: "Private database details" } });
        const response = await request(path, method, input);
        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), { error: "Content data does not satisfy database constraints." });
      }
    }
  });

  await t.test("unexpected database and network failures return safe 500 responses", async () => {
    for (const [path, method, databaseMethod] of [["/contents", "GET", "GET"], ["/contents/1", "GET", "GET"], ["/contents", "POST", "POST"], ["/contents/1", "PUT", "PATCH"], ["/contents/1", "DELETE", "DELETE"]]) {
      for (const failure of [{ status: 500, data: { code: "XX000", message: "Private database details" } }, { networkError: true }]) {
        pendingResponses.push({ method: databaseMethod, ...failure });
        const response = await request(path, method, ["POST", "PUT"].includes(method) ? input : undefined);
        assert.equal(response.status, 500);
        assert.deepEqual(await response.json(), { error: "Unable to complete the content operation." });
      }
    }
  });

  assert.equal(pendingResponses.length, 0);
});
