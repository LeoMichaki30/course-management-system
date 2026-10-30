const assert = require("node:assert/strict");
const { once } = require("node:events");
const { test } = require("node:test");

test("users endpoints with simulated Supabase responses", async (t) => {
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
    assert.equal(url.pathname, "/rest/v1/users");
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
  const user = {
    id: "1",
    name: "Test User",
    email: "test@example.com",
    status: "active",
    created_at: "2026-10-30T00:00:00Z",
    updated_at: "2026-10-30T00:00:00Z"
  };

  await t.test("root endpoint is preserved", async () => {
    const response = await request("/");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { message: "Course Management System API", version: "1.0.0" });
  });

  await t.test("lists users and handles an empty list", async () => {
    for (const data of [[user], []]) {
      pendingResponses.push({ method: "GET", data });
      const response = await request("/users");
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), data);
    }
  });

  await t.test("finds a user and returns 404 for a missing user", async () => {
    for (const [data, status] of [[[user], 200], [[], 404]]) {
      pendingResponses.push({ method: "GET", id: "1", data });
      const response = await request("/users/1");
      assert.equal(response.status, status);
      if (status === 200) assert.deepEqual(await response.json(), user);
    }
  });

  await t.test("lists all users when the database response is capped", async () => {
    const secondUser = { ...user, id: "2", email: "second@example.com" };
    pendingResponses.push(
      { method: "GET", offset: 0, count: 2, data: [user] },
      { method: "GET", offset: 1, count: 2, data: [secondUser] }
    );
    const response = await request("/users");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [user, secondUser]);
  });

  await t.test("creates a user with normalized fields and default status", async () => {
    pendingResponses.push({ method: "POST", body: { name: "Test User", email: "test@example.com", status: "active" }, data: user, status: 201 });
    const response = await request("/users", "POST", { name: " Test User ", email: " TEST@example.com " });
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("location"), "/users/1");
    assert.deepEqual(await response.json(), user);
  });

  await t.test("updates all editable fields", async () => {
    const input = { name: "Updated User", email: "updated@example.com", status: "inactive" };
    pendingResponses.push({ method: "PATCH", id: "1", body: input, data: [{ ...user, ...input }] });
    const response = await request("/users/1", "PUT", { ...input, email: " UPDATED@example.com " });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ...user, ...input });
  });

  await t.test("updating a missing user returns 404", async () => {
    pendingResponses.push({ method: "PATCH", id: "1", data: [] });
    const response = await request("/users/1", "PUT", { name: "Test", email: "test@example.com", status: "active" });
    assert.equal(response.status, 404);
  });

  await t.test("deletes a user with no response body and handles a missing user", async () => {
    for (const [data, status] of [[[{ id: "1" }], 204], [[], 404]]) {
      pendingResponses.push({ method: "DELETE", id: "1", data });
      const response = await request("/users/1", "DELETE");
      assert.equal(response.status, status);
      if (status === 204) assert.equal(await response.text(), "");
    }
  });

  await t.test("duplicate email returns 409 on create and update", async () => {
    for (const [path, method, databaseMethod] of [["/users", "POST", "POST"], ["/users/1", "PUT", "PATCH"]]) {
      pendingResponses.push({ method: databaseMethod, status: 409, data: { code: "23505", message: "Private database details" } });
      const response = await request(path, method, { name: "Test", email: "test@example.com", status: "active" });
      assert.equal(response.status, 409);
      assert.deepEqual(await response.json(), { error: "A user with this email already exists." });
    }
  });

  await t.test("foreign key deletion conflict returns 409 without leaking details", async () => {
    pendingResponses.push({ method: "DELETE", status: 409, data: { code: "23503", message: "Private database details" } });
    const response = await request("/users/1", "DELETE");
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "Cannot delete a user linked to courses or modules." });
  });

  await t.test("rejects invalid IDs without accessing the database", async () => {
    const callsBefore = databaseCalls;
    for (const id of ["0", "-1", "1.5", "abc", "1e3", "9223372036854775808", "99999999999999999999999"]) {
      for (const method of ["GET", "PUT", "DELETE"]) {
        const response = await request(`/users/${id}`, method);
        assert.equal(response.status, 400);
      }
    }
    assert.equal(databaseCalls, callsBefore);
  });

  await t.test("preserves IDs beyond the safe JavaScript integer range", async () => {
    const id = "9223372036854775807";
    pendingResponses.push({ method: "GET", id, data: [{ ...user, id }] });
    const response = await request(`/users/${id}`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).id, id);
  });

  await t.test("rejects invalid or protected fields without database access", async () => {
    const callsBefore = databaseCalls;
    const invalidBodies = [
      {}, [], null,
      { name: " ", email: "test@example.com" },
      { name: 123, email: "test@example.com" },
      { name: "Test", email: "invalid" },
      { name: "Test", email: null },
      { name: "Test", email: "test@example.com", status: "pending" },
      { name: "Test", email: "test@example.com", status: null },
      ...["id", "created_at", "updated_at", "extra"].map(key => ({ name: "Test", email: "test@example.com", [key]: "untrusted" }))
    ];
    for (const body of invalidBodies) {
      const response = await request("/users", "POST", body);
      assert.equal(response.status, 400);
    }
    const response = await request("/users/1", "PUT", { name: "Test", email: "test@example.com" });
    assert.equal(response.status, 400);
    assert.equal(databaseCalls, callsBefore);
  });

  await t.test("malformed JSON produces a safe 400 response", async () => {
    const response = await originalFetch(`${baseUrl}/users`, { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"name":' });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Request body must contain valid JSON." });
  });

  await t.test("oversized JSON produces a safe 413 response", async () => {
    const response = await request("/users", "POST", { name: "x".repeat(110000), email: "test@example.com" });
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { error: "Request body is too large." });
  });

  await t.test("database constraint errors return 400", async () => {
    pendingResponses.push({ method: "POST", status: 400, data: { code: "23514", message: "Private details" } });
    const response = await request("/users", "POST", { name: "Test", email: "test@example.com" });
    assert.equal(response.status, 400);
  });

  await t.test("unexpected database and network errors return safe 500 responses", async () => {
    for (const failure of [{ status: 500, data: { code: "XX000", message: "Private details" } }, { networkError: true }]) {
      pendingResponses.push({ method: "GET", ...failure });
      const response = await request("/users");
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { error: "Unable to complete the user operation." });
    }
  });

  assert.equal(pendingResponses.length, 0);
});
