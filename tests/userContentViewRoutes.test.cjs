const assert = require("node:assert/strict");
const { once } = require("node:events");
const { test } = require("node:test");

test("content views endpoints with simulated Supabase responses", async (t) => {
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
    const expected = pendingResponses.shift();
    assert.ok(expected, "Unexpected database request");
    databaseCalls++;
    assert.equal(url.pathname, `/rest/v1/${expected.table}`);
    assert.equal(options.method, expected.method ?? "GET");
    if (expected.body) assert.deepEqual(JSON.parse(options.body), expected.body);
    if (expected.id) assert.equal(url.searchParams.get("id"), `eq.${expected.id}`);
    if (expected.field) {
      assert.equal(url.searchParams.get(expected.field), `eq.${expected.value}`);
      assert.equal(url.searchParams.get("order"), expected.field === "user_id" ? "content_id.asc" : "user_id.asc");
      assert.equal(url.searchParams.get("offset"), String(expected.offset ?? 0));
      assert.equal(url.searchParams.get("limit"), "1000");
    }
    const columns = url.searchParams.get("select").split(",");
    if (expected.table === "user_content_views") {
      assert.deepEqual(columns, ["user_id::text", "content_id::text", "watched_at"]);
      assert.equal(url.searchParams.has("on_conflict"), false);
      assert.equal(String(options.headers.get("Prefer")).includes("resolution="), false);
    } else {
      assert.ok(columns.includes("id::text"));
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
  const input = { user_id: "1", content_id: "2" };
  const view = { ...input, watched_at: "2026-10-01T10:00:00Z" };
  const user = { id: "1", name: "Test User", email: "test@example.com", status: "active" };
  const content = { id: "2", module_id: "1", title: "Test Content", content: "Learning material" };
  const failureMessage = { error: "Unable to complete the content view operation." };

  await t.test("records a view without supplying watched_at so the database generates it", async () => {
    pendingResponses.push({ table: "user_content_views", method: "POST", body: input, data: view, status: 201 });
    const response = await request("/content-views", "POST", input);
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), view);
  });

  await t.test("accepts explicit timestamps with fractions, offsets, leap days and future dates", async () => {
    for (const watched_at of ["2024-02-29T23:59:59Z", "2000-02-29T00:00:00Z", "2026-10-01T10:00:00.123456+03:30", "2099-12-31T12:00:00-03:00", "0001-01-01T00:00:00Z"]) {
      const body = { ...input, watched_at };
      pendingResponses.push({ table: "user_content_views", method: "POST", body, data: body });
      const response = await request("/content-views", "POST", body);
      assert.equal(response.status, 201);
      assert.deepEqual(await response.json(), body);
    }
  });

  const queries = [
    { route: "users", table: "users", field: "user_id", id: "1", parent: user, missing: "User not found." },
    { route: "contents", table: "contents", field: "content_id", id: "2", parent: content, missing: "Content not found." }
  ];

  await t.test("duplicate views return 409 without updating the original timestamp", async () => {
    const body = { ...input, watched_at: view.watched_at };
    pendingResponses.push({ table: "user_content_views", method: "POST", body, data: view });
    assert.equal((await request("/content-views", "POST", body)).status, 201);
    const callsBefore = databaseCalls;
    pendingResponses.push({ table: "user_content_views", method: "POST", body: { ...input, watched_at: "2099-01-01T00:00:00Z" }, status: 409, data: { code: "23505", message: "Private unique constraint details" } });
    const duplicate = await request("/content-views", "POST", { ...input, watched_at: "2099-01-01T00:00:00Z" });
    assert.equal(duplicate.status, 409);
    assert.deepEqual(await duplicate.json(), { error: "This user has already viewed this content." });
    assert.equal(databaseCalls, callsBefore + 1);
    pendingResponses.push(
      { table: "users", id: "1", data: [user] },
      { table: "user_content_views", field: "user_id", value: "1", data: [view] }
    );
    const response = await request("/content-views/users/1");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [view]);
  });

  for (const field of ["user_id", "content_id"]) {
    await t.test(`POST handles a nonexistent ${field} without exposing database details`, async () => {
      const body = { ...input, [field]: "999" };
      pendingResponses.push({ table: "user_content_views", method: "POST", body, status: 409, data: { code: "23503", message: `Private ${field} violation`, details: "Private record" } });
      const response = await request("/content-views", "POST", body);
      assert.equal(response.status, 409);
      assert.deepEqual(await response.json(), { error: "The specified user or content does not exist." });
    });
  }

  for (const query of queries) {
    await t.test(`lists ${query.route} views and distinguishes an empty list from a missing parent`, async () => {
      for (const data of [[view], []]) {
        pendingResponses.push(
          { table: query.table, id: query.id, data: [query.parent] },
          { table: "user_content_views", field: query.field, value: query.id, data }
        );
        const response = await request(`/content-views/${query.route}/${query.id}`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), data);
      }
      const callsBefore = databaseCalls;
      pendingResponses.push({ table: query.table, id: query.id, data: [] });
      const response = await request(`/content-views/${query.route}/${query.id}`);
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { error: query.missing });
      assert.equal(databaseCalls, callsBefore + 1);
    });

    await t.test(`paginates ${query.route} views with a stable order and filter on every page`, async () => {
      const secondView = { ...view, [query.field === "user_id" ? "content_id" : "user_id"]: "3" };
      pendingResponses.push(
        { table: query.table, id: query.id, data: [query.parent] },
        { table: "user_content_views", field: query.field, value: query.id, offset: 0, count: 2, data: [view] },
        { table: "user_content_views", field: query.field, value: query.id, offset: 1, count: 2, data: [secondView] }
      );
      const response = await request(`/content-views/${query.route}/${query.id}`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), [view, secondView]);
    });

    await t.test(`preserves BIGINT IDs in ${query.route} queries`, async () => {
      const id = "9223372036854775807";
      const largeView = { user_id: id, content_id: id, watched_at: view.watched_at };
      pendingResponses.push(
        { table: query.table, id, data: [{ ...query.parent, id }] },
        { table: "user_content_views", field: query.field, value: id, data: [largeView] }
      );
      const response = await request(`/content-views/${query.route}/${id}`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), [largeView]);
    });

    await t.test(`handles failures in the ${query.route} parent lookup and view query safely`, async () => {
      for (const stage of ["parent", "views"]) {
        for (const failure of [{ status: 500, data: { code: "XX000", message: "Private database details" } }, { networkError: true }]) {
          if (stage === "views") pendingResponses.push({ table: query.table, id: query.id, data: [query.parent] });
          pendingResponses.push({ table: stage === "parent" ? query.table : "user_content_views", ...failure });
          const response = await request(`/content-views/${query.route}/${query.id}`);
          assert.equal(response.status, 500);
          assert.deepEqual(await response.json(), failureMessage);
        }
      }
    });
  }

  await t.test("preserves both BIGINT IDs when registering a view", async () => {
    const id = "9223372036854775807";
    const body = { user_id: id, content_id: id };
    const record = { ...body, watched_at: view.watched_at };
    pendingResponses.push({ table: "user_content_views", method: "POST", body, data: record });
    const response = await request("/content-views", "POST", body);
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), record);
  });

  await t.test("rejects invalid route and body IDs without database access", async () => {
    const callsBefore = databaseCalls;
    const invalidIds = ["0", "01", "-1", "1.5", "1e3", "abc", " 1", "1 ", "9223372036854775808", "99999999999999999999999"];
    for (const id of invalidIds) {
      for (const query of queries) assert.equal((await request(`/content-views/${query.route}/${encodeURIComponent(id)}`)).status, 400);
    }
    for (const field of ["user_id", "content_id"]) {
      for (const value of [...invalidIds, undefined, null, 1, 9007199254740992, true, {}, []]) {
        assert.equal((await request("/content-views", "POST", { ...input, [field]: value })).status, 400);
      }
    }
    assert.equal(databaseCalls, callsBefore);
  });

  await t.test("rejects malformed bodies, unknown fields and invalid timestamps without database access", async () => {
    const callsBefore = databaseCalls;
    const invalidDates = [null, 123, true, {}, [], "", "invalid", "2026-10-01", "2026-10-01T10:00:00", "2026-02-29T10:00:00Z", "1900-02-29T00:00:00Z", "2024-02-30T00:00:00Z", "2026-04-31T00:00:00Z", "2026-00-01T00:00:00Z", "2026-13-01T00:00:00Z", "2026-01-00T00:00:00Z", "0000-01-01T00:00:00Z", "2026-01-01T24:00:00Z", "2026-01-01T00:60:00Z", "2026-01-01T00:00:60Z", "2026-01-01T00:00:00+24:00", "2026-01-01T00:00:00+03:60", " 2026-01-01T00:00:00Z "];
    const bodies = [{}, [], null, ...invalidDates.map(watched_at => ({ ...input, watched_at })), ...["id", "created_at", "updated_at", "extra"].map(key => ({ ...input, [key]: "untrusted" }))];
    for (const body of bodies) assert.equal((await request("/content-views", "POST", body)).status, 400);
    assert.equal(databaseCalls, callsBefore);
  });

  await t.test("handles malformed and oversized JSON with the existing middleware", async () => {
    const malformed = await originalFetch(`${baseUrl}/content-views`, { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"user_id":' });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { error: "Request body must contain valid JSON." });
    const oversized = await request("/content-views", "POST", { ...input, watched_at: "x".repeat(110000) });
    assert.equal(oversized.status, 413);
    assert.deepEqual(await oversized.json(), { error: "Request body is too large." });
  });

  await t.test("returns safe 400 responses for database data and timestamp constraints", async () => {
    for (const code of ["23502", "23514", "22P02", "22007", "22008"]) {
      pendingResponses.push({ table: "user_content_views", method: "POST", status: 400, data: { code, message: "Private database details" } });
      const response = await request("/content-views", "POST", input);
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: "Content view data does not satisfy database constraints." });
    }
  });

  await t.test("handles unexpected insert and network failures without exposing details", async () => {
    for (const failure of [{ status: 500, data: { code: "XX000", message: "Private database details" } }, { networkError: true }]) {
      pendingResponses.push({ table: "user_content_views", method: "POST", ...failure });
      const response = await request("/content-views", "POST", input);
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), failureMessage);
    }
  });

  assert.equal(pendingResponses.length, 0);
});
