const assert = require("node:assert/strict");
const { once } = require("node:events");
const { test } = require("node:test");

test("courses endpoints with simulated Supabase responses", async (t) => {
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
    assert.equal(url.pathname, "/rest/v1/courses");
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
    if (expected.method !== "DELETE") assert.ok(url.searchParams.get("select").includes("user_id::text"));
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
  const input = { user_id: "1", code: "Course-001", title: "Test Course", description: "Course description" };
  const course = {
    id: "1",
    ...input,
    created_at: "2026-10-31T00:00:00Z",
    updated_at: "2026-10-31T00:00:00Z"
  };

  await t.test("lists courses and handles an empty list", async () => {
    for (const data of [[course], []]) {
      pendingResponses.push({ method: "GET", data });
      const response = await request("/courses");
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), data);
    }
  });

  await t.test("lists all courses when database responses are capped", async () => {
    const secondCourse = { ...course, id: "2", code: "Course-002" };
    pendingResponses.push(
      { method: "GET", offset: 0, count: 2, data: [course] },
      { method: "GET", offset: 1, count: 2, data: [secondCourse] }
    );
    const response = await request("/courses");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [course, secondCourse]);
  });

  await t.test("finds a course and returns 404 when missing", async () => {
    for (const [data, status] of [[[course], 200], [[], 404]]) {
      pendingResponses.push({ method: "GET", id: "1", data });
      const response = await request("/courses/1");
      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), status === 200 ? course : { error: "Course not found." });
    }
  });

  await t.test("creates courses and normalizes text without changing code case", async () => {
    for (const description of [undefined, null, "", "  Course description  "]) {
      const normalized = { ...input, description: description?.trim() ?? null };
      pendingResponses.push({ method: "POST", body: normalized, data: { ...course, ...normalized }, status: 201 });
      const response = await request("/courses", "POST", { ...input, code: "  Course-001  ", title: "  Test Course  ", description });
      assert.equal(response.status, 201);
      assert.equal(response.headers.get("location"), "/courses/1");
      assert.deepEqual(await response.json(), { ...course, ...normalized });
    }
  });

  await t.test("accepts code and title without arbitrary format or length limits", async () => {
    const body = { ...input, code: "Course / edition #1! " + "x".repeat(300), title: "Title: " + "x".repeat(500) };
    pendingResponses.push({ method: "POST", body, data: { ...course, ...body }, status: 201 });
    const response = await request("/courses", "POST", body);
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { ...course, ...body });
  });

  await t.test("replaces all editable fields and supports clearing the description", async () => {
    for (const description of [" Updated description ", null, ""]) {
      const body = { user_id: "2", code: "Updated-Code", title: "Updated Title", description };
      const normalized = { ...body, description: description?.trim() ?? null };
      pendingResponses.push({ method: "PATCH", id: "1", body: normalized, data: [{ ...course, ...normalized }] });
      const response = await request("/courses/1", "PUT", { ...body, title: " Updated Title " });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ...course, ...normalized });
    }
  });

  await t.test("updating a missing course returns 404", async () => {
    pendingResponses.push({ method: "PATCH", id: "1", body: input, data: [] });
    const response = await request("/courses/1", "PUT", input);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Course not found." });
  });

  await t.test("deletes a course with no response body and handles missing courses", async () => {
    for (const [data, status] of [[[{ id: "1" }], 204], [[], 404]]) {
      pendingResponses.push({ method: "DELETE", id: "1", data });
      const response = await request("/courses/1", "DELETE");
      assert.equal(response.status, status);
      if (status === 204) assert.equal(await response.text(), "");
      else assert.deepEqual(await response.json(), { error: "Course not found." });
    }
  });

  await t.test("duplicate code returns 409 on create and update", async () => {
    for (const [path, method, databaseMethod] of [["/courses", "POST", "POST"], ["/courses/1", "PUT", "PATCH"]]) {
      pendingResponses.push({ method: databaseMethod, status: 409, data: { code: "23505", message: "Private database details" } });
      const response = await request(path, method, input);
      assert.equal(response.status, 409);
      assert.deepEqual(await response.json(), { error: "A course with this code already exists." });
    }
  });

  await t.test("23503 on create and update identifies a nonexistent creator", async () => {
    for (const [path, method, databaseMethod] of [["/courses", "POST", "POST"], ["/courses/1", "PUT", "PATCH"]]) {
      pendingResponses.push({ method: databaseMethod, status: 409, data: { code: "23503", message: "Private database details", details: "Private user data" } });
      const response = await request(path, method, input);
      assert.equal(response.status, 409);
      assert.deepEqual(await response.json(), { error: "The specified user does not exist." });
    }
  });

  await t.test("23503 on delete identifies modules blocking course deletion", async () => {
    pendingResponses.push({ method: "DELETE", status: 409, data: { code: "23503", message: "Private database details", details: "Private module data" } });
    const response = await request("/courses/1", "DELETE");
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "Cannot delete a course linked to modules." });
  });

  await t.test("rejects invalid route IDs without database access", async () => {
    const callsBefore = databaseCalls;
    for (const id of ["0", "01", "-1", "1.5", "abc", "1e3", "9223372036854775808", "99999999999999999999999"]) {
      for (const method of ["GET", "PUT", "DELETE"]) {
        const response = await request(`/courses/${id}`, method, method === "PUT" ? input : undefined);
        assert.equal(response.status, 400);
      }
    }
    assert.equal(databaseCalls, callsBefore);
  });

  await t.test("preserves course and creator IDs beyond JavaScript's safe integer range", async () => {
    const id = "9223372036854775807";
    const largeCourse = { ...course, id, user_id: id };
    pendingResponses.push({ method: "GET", id, data: [largeCourse] });
    const found = await request(`/courses/${id}`);
    assert.equal(found.status, 200);
    assert.deepEqual(await found.json(), largeCourse);
    for (const [path, method, databaseMethod] of [["/courses", "POST", "POST"], [`/courses/${id}`, "PUT", "PATCH"]]) {
      const body = { ...input, user_id: id };
      pendingResponses.push({ method: databaseMethod, body, data: method === "POST" ? largeCourse : [largeCourse] });
      const response = await request(path, method, body);
      assert.equal(response.status, method === "POST" ? 201 : 200);
      assert.deepEqual(await response.json(), largeCourse);
    }
  });

  await t.test("rejects invalid and protected fields without database access", async () => {
    const callsBefore = databaseCalls;
    const invalidBodies = [
      {}, [], null,
      ...[undefined, null, 1, 9007199254740992, "0", "01", "-1", "1.5", "1e3", "abc", "9223372036854775808"].map(user_id => ({ ...input, user_id })),
      ...["code", "title"].flatMap(key => [undefined, null, 123, "", "   "].map(value => ({ ...input, [key]: value }))),
      ...[123, false, {}, []].map(description => ({ ...input, description })),
      ...["id", "created_at", "updated_at", "extra"].map(key => ({ ...input, [key]: "untrusted" }))
    ];
    for (const [path, method] of [["/courses", "POST"], ["/courses/1", "PUT"]]) {
      for (const body of invalidBodies) {
        const response = await request(path, method, body);
        assert.equal(response.status, 400);
      }
    }
    const { description, ...withoutDescription } = input;
    const response = await request("/courses/1", "PUT", withoutDescription);
    assert.equal(response.status, 400);
    assert.equal(databaseCalls, callsBefore);
  });

  await t.test("malformed and oversized JSON use the existing error middleware", async () => {
    const malformed = await originalFetch(`${baseUrl}/courses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"code":' });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { error: "Request body must contain valid JSON." });
    const oversized = await request("/courses", "POST", { ...input, title: "x".repeat(110000) });
    assert.equal(oversized.status, 413);
    assert.deepEqual(await oversized.json(), { error: "Request body is too large." });
  });

  await t.test("database data constraint errors return safe 400 responses", async () => {
    for (const code of ["23502", "23514", "22P02"]) {
      for (const [path, method, databaseMethod] of [["/courses", "POST", "POST"], ["/courses/1", "PUT", "PATCH"]]) {
        pendingResponses.push({ method: databaseMethod, status: 400, data: { code, message: "Private database details" } });
        const response = await request(path, method, input);
        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), { error: "Course data does not satisfy database constraints." });
      }
    }
  });

  await t.test("unexpected database and network failures return safe 500 responses", async () => {
    for (const [path, method, databaseMethod] of [["/courses", "GET", "GET"], ["/courses/1", "GET", "GET"], ["/courses", "POST", "POST"], ["/courses/1", "PUT", "PATCH"], ["/courses/1", "DELETE", "DELETE"]]) {
      for (const failure of [{ status: 500, data: { code: "XX000", message: "Private database details" } }, { networkError: true }]) {
        pendingResponses.push({ method: databaseMethod, ...failure });
        const response = await request(path, method, ["POST", "PUT"].includes(method) ? input : undefined);
        assert.equal(response.status, 500);
        assert.deepEqual(await response.json(), { error: "Unable to complete the course operation." });
      }
    }
  });

  assert.equal(pendingResponses.length, 0);
});
