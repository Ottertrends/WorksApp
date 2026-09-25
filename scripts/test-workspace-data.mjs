import test from "node:test";
import assert from "node:assert/strict";
import { readWorkspaceData, WORKSPACE_RESOURCES, safeSearchTerm } from "../src/lib/agent/workspace-data.ts";

const owner = "11111111-1111-4111-8111-111111111111";
const actor = "22222222-2222-4222-8222-222222222222";
const stranger = "33333333-3333-4333-8333-333333333333";
const invoiceId = "44444444-4444-4444-8444-444444444444";

function database(tables = {}, errors = {}) {
  const calls = [];
  return { calls, from(table) {
    const state = { table, filters: [], start: 0, end: Infinity, fields: "", orders: [] };
    calls.push(state);
    const result = () => {
      if (errors[table]) return { data: null, error: { code: errors[table] } };
      const rows = (tables[table] ?? []).filter(row => state.filters.every(([key, value]) => row[key] === value));
      return { data: rows.slice(state.start, state.end + 1).map(row => Object.fromEntries(state.fields.split(",").filter(field => field in row).map(field => [field, row[field]]))), count: rows.length, error: null };
    };
    const query = {
      select(fields) { state.fields = fields; return query; },
      eq(key, value) { state.filters.push([key, value]); return query; },
      order(key) { state.orders.push(key); return query; },
      or(expression) { state.expression = expression; return query; },
      range(start, end) { state.start = start; state.end = end; return query; },
      async maybeSingle() { const value = result(); return { ...value, data: value.data?.[0] ?? null }; },
      then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
    };
    return query;
  } };
}

test("workspace queries cannot expose another contractor's rows", async () => {
  const db = database({ projects: [{ id: invoiceId, user_id: owner, name: "Owner project" }, { id: stranger, user_id: stranger, name: "Private" }] });
  const result = await readWorkspaceData(db, actor, owner, { resource: "projects" });
  assert.equal(result.total, 1);
  assert.deepEqual(result.records.map(row => row.name), ["Owner project"]);
  assert.deepEqual(db.calls[0].filters, [["user_id", owner]]);
});

test("personal records stay actor-scoped in a team", async () => {
  for (const [resource, definition] of Object.entries(WORKSPACE_RESOURCES).filter(([, definition]) => definition.scope === "actor")) {
    const db = database();
    await readWorkspaceData(db, actor, owner, { resource });
    assert.deepEqual(db.calls[0].filters[0], [definition.ownerColumn ?? "user_id", actor], resource);
  }
});

test("unrecognized resources, raw SQL, scope overrides, and unbounded reads are rejected", async () => {
  for (const input of [{ resource: "auth.users" }, { resource: "projects", user_id: stranger }, { resource: "projects", sql: "select * from profiles" }, { resource: "projects", limit: 1000 }, { resource: "projects", offset: -1 }, { resource: "projects", record_id: "bad" }]) {
    const db = database();
    assert.equal((await readWorkspaceData(db, actor, owner, input)).ok, false);
    assert.equal(db.calls.length, 0);
  }
});

test("invoice line items require a verified workspace-owned parent", async () => {
  const db = database({ invoices: [{ id: invoiceId, user_id: stranger }], invoice_items: [{ invoice_id: invoiceId, description: "Private item" }] });
  assert.equal((await readWorkspaceData(db, actor, owner, { resource: "invoice_items", invoice_id: invoiceId })).ok, false);
  assert.equal(db.calls.length, 1);
  const allowed = database({ invoices: [{ id: invoiceId, user_id: owner }], invoice_items: [{ invoice_id: invoiceId, description: "Allowed item" }, { invoice_id: stranger, description: "Private item" }] });
  const result = await readWorkspaceData(allowed, actor, owner, { resource: "invoice_items", invoice_id: invoiceId });
  assert.deepEqual(result.records.map(row => row.description), ["Allowed item"]);
});

test("pagination reports full count and provides access beyond first page", async () => {
  const db = database({ clients: Array.from({ length: 23 }, (_, index) => ({ id: String(index), user_id: owner, client_name: `Client ${index}` })) });
  const first = await readWorkspaceData(db, actor, owner, { resource: "clients", limit: 10 });
  assert.equal(first.total, 23);
  assert.equal(first.next_offset, 10);
  const last = await readWorkspaceData(db, actor, owner, { resource: "clients", limit: 10, offset: 20 });
  assert.equal(last.returned, 3);
  assert.equal(last.next_offset, null);
});

test("unavailable database resources are errors, not empty business records", async () => {
  const result = await readWorkspaceData(database({}, { projects: "PGRST205" }), actor, owner, { resource: "projects" });
  assert.equal(result.ok, false);
  assert.equal(result.code, "PGRST205");
  assert.equal(result.records, undefined);
});

test("stored long text is flagged and search cannot introduce filter operators", async () => {
  assert.ok(!/[%,()."\\*]/.test(safeSearchTerm('x%,user_id.eq.other,(a)"\\*')));
  const db = database({ projects: [{ id: invoiceId, user_id: owner, notes: "n".repeat(5000) }] });
  const result = await readWorkspaceData(db, actor, owner, { resource: "projects", record_id: invoiceId });
  assert.equal(result.records[0].notes.length, 4000);
  assert.deepEqual(result.truncated_fields, ["0.notes"]);
});

test("catalog projections exclude credentials and raw operational payloads", () => {
  for (const definition of Object.values(WORKSPACE_RESOURCES)) {
    assert.doesNotMatch(`${definition.fields},${definition.detail ?? ""}`, /\*|token|ciphertext|secret|password|raw|webhook|storage_path/i);
  }
});

test("long fields remain fully accessible through scoped chunk retrieval", async () => {
  const db = database({ projects: [{ id: invoiceId, user_id: owner, notes: "n".repeat(5000) }] });
  const first = await readWorkspaceData(db, actor, owner, { resource: "projects", record_id: invoiceId, field: "notes" });
  const last = await readWorkspaceData(db, actor, owner, { resource: "projects", record_id: invoiceId, field: "notes", text_offset: first.next_text_offset });
  assert.equal(first.text.length + last.text.length, 5000);
  assert.equal(last.next_text_offset, null);
  assert.equal((await readWorkspaceData(db, actor, owner, { resource: "my_profile", field: "refresh_token" })).ok, false);
});
