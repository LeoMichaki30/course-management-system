const assert = require("node:assert/strict");
const { once } = require("node:events");
const { test } = require("node:test");

test("local frontend CORS allows exact local origins without exposing wildcard access", async (t) => {
  process.env.SUPABASE_URL = "https://database.example.invalid";
  process.env.SUPABASE_SECRET_KEY = "test-server-key";
  process.env.DOTENV_CONFIG_PATH = "/nonexistent/course-management-test.env";
  process.env.DOTENV_CONFIG_QUIET = "true";
  const app = require("../src/app.ts").default;
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}/`;
  for (const origin of ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173"]) {
    const response = await fetch(url, { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "Content-Type" } });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
    assert.match(response.headers.get("access-control-allow-methods"), /PUT/);
    assert.equal(response.headers.get("access-control-allow-headers"), "Content-Type");
    assert.equal(response.headers.get("access-control-allow-credentials"), null);
  }
  for (const origin of ["https://example.com", "http://localhost:9999", "http://localhost:5173.example.com", "null"]) {
    const response = await fetch(url, { headers: { Origin: origin } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
    assert.match(response.headers.get("vary"), /Origin/);
  }
  assert.equal((await fetch(url)).status, 200);
});
