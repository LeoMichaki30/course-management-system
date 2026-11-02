import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPayload, initialValues, validateValues } from "../src/forms.ts";

test("PUT payloads include only editable fields and preserve BIGINT IDs", () => {
  const id = "9223372036854775807";
  const values = { ...initialValues(), id: "untrusted", user_id: id, course_id: id, module_id: id, title: " Course ", code: " Code-1 ", description: "", content: " \n# Lesson\n\tformatted\n " };
  assert.deepEqual(buildPayload("courses", values), { user_id: id, code: "Code-1", title: "Course", description: null });
  assert.deepEqual(buildPayload("modules", values), { course_id: id, user_id: id, title: "Course", description: null });
  assert.deepEqual(buildPayload("contents", values), { module_id: id, title: "Course", content: values.content });
  assert.equal(validateValues("contents", values), null);
});

test("users use the full replacement contract and normalize email", () => {
  const values = { ...initialValues(), name: " Example User ", email: " TEST@EXAMPLE.COM ", status: "inactive" };
  assert.deepEqual(buildPayload("users", values), { name: "Example User", email: "test@example.com", status: "inactive" });
  assert.equal(validateValues("users", values), null);
  assert.ok(validateValues("users", { ...values, email: "invalid" }));
});

test("validation rejects blank material and missing or invalid relationships", () => {
  const values = { ...initialValues(), title: "Lesson", module_id: "1", content: "\n  \t" };
  assert.ok(validateValues("contents", values));
  for (const module_id of ["", "0", "01", "-1", "1.2", "9223372036854775808"]) {
    assert.ok(validateValues("contents", { ...values, content: "text", module_id }));
  }
  assert.ok(validateValues("modules", { ...initialValues(), title: "Module" }));
});
