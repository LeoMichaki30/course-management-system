const assert = require("node:assert/strict");
const { once } = require("node:events");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");

test("Swagger UI and OpenAPI document reflect the existing API without database requests", async (t) => {
  process.env.SUPABASE_URL = "https://database.example.invalid";
  process.env.SUPABASE_SECRET_KEY = "test-server-key";
  process.env.DOTENV_CONFIG_PATH = "/nonexistent/course-management-test.env";
  process.env.DOTENV_CONFIG_QUIET = "true";
  const originalFetch = globalThis.fetch;
  let databaseCalls = 0;
  globalThis.fetch = async () => {
    databaseCalls++;
    throw new Error("Documentation must not query the database");
  };

  const app = require("../src/app.ts").default;
  const server = app.listen(0, "127.0.0.1");
  t.after(async () => {
    globalThis.fetch = originalFetch;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const response = await originalFetch(`${baseUrl}/api-docs.json`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  const document = await response.json();

  await t.test("serves Swagger UI, its local assets, and its same-origin document configuration", async () => {
    const response = await originalFetch(`${baseUrl}/api-docs`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Course Management System API Docs/);
    assert.match(html, /swagger-ui-bundle\.js/);
    for (const asset of ["swagger-ui.css", "swagger-ui-bundle.js", "swagger-ui-init.js"]) {
      const assetResponse = await originalFetch(`${baseUrl}/api-docs/${asset}`);
      assert.equal(assetResponse.status, 200);
      const content = await assetResponse.text();
      assert.ok(content.length > 0);
      if (asset === "swagger-ui-init.js") {
        assert.match(content, /\/api-docs\.json/);
        assert.match(content, /"validatorUrl": null/);
      }
    }
  });

  await t.test("documents every existing business route and method, and preserves the root response", async () => {
    assert.equal(document.openapi, "3.0.3");
    assert.equal(document.servers[0].url, "/");
    const rootResponse = await originalFetch(`${baseUrl}/`);
    assert.equal(rootResponse.status, 200);
    assert.deepEqual(await rootResponse.json(), { message: "Course Management System API", version: "1.0.0" });
    const expectedOperations = new Set(["get /"]);
    const routeFiles = [
      ["users", "user"], ["courses", "course"], ["modules", "module"], ["contents", "content"], ["content-views", "userContentView"]
    ];
    for (const [base, file] of routeFiles) {
      const source = readFileSync(new URL(`../src/routes/${file}Routes.ts`, `file://${__filename}`), "utf8");
      for (const [, method, route] of source.matchAll(/\w+Routes\.(get|post|put|delete)\("([^"]+)"/g)) {
        const suffix = route === "/" ? "" : route.replace(/:(\w+)/g, "{$1}");
        expectedOperations.add(`${method} /${base}${suffix}`);
      }
    }
    const actualOperations = new Set();
    const operationIds = new Set();
    for (const [path, item] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(item)) {
        if (!["get", "post", "put", "delete", "patch"].includes(method)) continue;
        actualOperations.add(`${method} ${path}`);
        assert.equal(operationIds.has(operation.operationId), false, operation.operationId);
        operationIds.add(operation.operationId);
        assert.ok(operation.summary);
        assert.ok(operation.tags.length);
        assert.ok(Object.keys(operation.responses).some(status => /^2\d\d$/.test(status)));
        const params = [...(item.parameters ?? []), ...(operation.parameters ?? [])];
        for (const [, name] of path.matchAll(/\{(\w+)\}/g)) {
          const parameter = params.find(parameter => parameter.name === name);
          assert.equal(parameter.in, "path");
          assert.equal(parameter.required, true);
          assert.equal(parameter.schema.$ref, "#/components/schemas/BigIntId");
        }
        if (["post", "put"].includes(method)) {
          assert.equal(operation.requestBody.required, true);
          assert.ok(operation.requestBody.content["application/json"].schema.$ref);
          assert.ok(operation.requestBody.content["application/json"].example || operation.requestBody.content["application/json"].examples);
          for (const status of ["400", "409", "413", "500"]) assert.ok(operation.responses[status]);
        }
      }
    }
    assert.deepEqual(actualOperations, expectedOperations);
    assert.equal(actualOperations.size, 24);
  });

  await t.test("resolves all local references and requires safe error schemas and response examples", () => {
    let references = 0;
    function visit(value) {
      if (value === null || typeof value !== "object") return;
      if (value.$ref) {
        assert.ok(value.$ref.startsWith("#/"));
        const target = value.$ref.slice(2).split("/").reduce((object, key) => object?.[key.replace(/~1/g, "/").replace(/~0/g, "~")], document);
        assert.ok(target, value.$ref);
        references++;
      }
      for (const child of Object.values(value)) visit(child);
    }
    visit(document);
    assert.ok(references > 50);
    assert.deepEqual(document.components.schemas.Error.required, ["error"]);
    assert.equal(document.components.schemas.Error.additionalProperties, false);
    for (const item of Object.values(document.paths)) {
      for (const method of ["get", "post", "put", "delete"]) {
        if (!item[method]) continue;
        for (const [status, response] of Object.entries(item[method].responses)) {
          const target = response.$ref ? document.components.responses[response.$ref.split("/").at(-1)] : response;
          assert.ok(target.description);
          if (status === "204") assert.equal(target.content, undefined);
          else {
            const json = target.content["application/json"];
            assert.ok(json.schema);
            assert.ok(json.example !== undefined || json.examples !== undefined);
          }
        }
      }
    }
  });

  await t.test("matches actual required fields, BIGINT strings, nullable descriptions and generated fields", () => {
    const schemas = document.components.schemas;
    assert.equal(schemas.BigIntId.type, "string");
    assert.match(schemas.BigIntId.description, /9223372036854775807/);
    const largeId = "9223372036854775807";
    assert.ok(new RegExp(schemas.BigIntId.pattern).test(largeId));
    const required = {
      CreateUserInput: ["name", "email"], UpdateUserInput: ["name", "email", "status"],
      CreateCourseInput: ["user_id", "code", "title"], UpdateCourseInput: ["user_id", "code", "title", "description"],
      CreateModuleInput: ["course_id", "user_id", "title"], UpdateModuleInput: ["course_id", "user_id", "title", "description"],
      CreateContentInput: ["module_id", "title", "content"], UpdateContentInput: ["module_id", "title", "content"],
      CreateUserContentViewInput: ["user_id", "content_id"]
    };
    for (const [name, fields] of Object.entries(required)) {
      assert.deepEqual(schemas[name].required, fields);
      assert.equal(schemas[name].additionalProperties, false);
      for (const key of ["id", "created_at", "updated_at"]) assert.equal(schemas[name].properties[key], undefined);
      for (const field of fields) assert.ok(field in schemas[name].example);
    }
    assert.equal(schemas.CreateUserInput.properties.status.default, "active");
    for (const name of ["Course", "Module", "CreateCourseInput", "UpdateCourseInput", "CreateModuleInput", "UpdateModuleInput"]) assert.equal(schemas[name].properties.description.nullable, true);
    for (const name of ["User", "Course", "Module", "Content"]) {
      for (const field of ["id", "created_at", "updated_at"]) assert.equal(schemas[name].properties[field].readOnly, true);
    }
    assert.match(schemas.CreateContentInput.properties.content.description, /stored unchanged/);
    assert.equal(schemas.UserContentView.properties.id, undefined);
    assert.deepEqual(schemas.UserContentView.required, ["user_id", "content_id", "watched_at"]);
    assert.equal(schemas.CreateUserContentViewInput.properties.watched_at.default, undefined);
  });

  await t.test("documents operation-specific conflicts and actual deletion behavior", () => {
    assert.equal(document.paths["/contents/{id}"].delete.responses["409"], undefined);
    assert.match(document.paths["/contents/{id}"].delete.description, /ON DELETE CASCADE/);
    for (const path of ["users", "courses", "modules"]) assert.ok(document.paths[`/${path}/{id}`].delete.responses["409"]);
    const examples = document.paths["/content-views"].post.responses["409"].content["application/json"].examples;
    assert.equal(examples.duplicate.value.error, "This user has already viewed this content.");
    assert.equal(examples.missingReference.value.error, "The specified user or content does not exist.");
    assert.match(document.paths["/content-views"].post.description, /no upsert or timestamp update/);
    for (const path of ["/content-views/users/{userId}", "/content-views/contents/{contentId}"]) assert.ok(document.paths[path].get.responses["404"]);
    assert.equal(document.components.securitySchemes, undefined);
    const serialized = JSON.stringify(document);
    assert.equal(serialized.includes("test-server-key"), false);
    assert.equal(serialized.includes("database.example.invalid"), false);
  });

  assert.equal(databaseCalls, 0);
});
