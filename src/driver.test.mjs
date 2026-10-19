import test from "node:test";
import assert from "node:assert/strict";
import { plan, run, envelope, Transport } from "./driver.mjs";
import { readFileSync } from "node:fs";
import { decoded, SignedFixtureDriver } from "./fixtures.mjs";
test("case denominator derives from complete fixed transition document", () => {
  const s = JSON.parse(
    readFileSync(new URL("../spec/transitions.json", import.meta.url)),
  );
  const expected =
    s.legal.length +
    s.selfLoops.reduce((n, x) => n + x.states.length, 0) +
    s.illegal.length +
    s.actorBinding.length +
    s.concurrency.length +
    s.fundingDealIdentity.cases.length;
  const p = plan(s);
  assert.equal(p.case_count, expected);
  assert.equal(new Set(p.cases.map((c) => c.id)).size, expected);
  s.legal.push({ from: "X", to: "Y" });
  assert.equal(plan(s).case_count, expected + 1);
});
test("unavailable Runtime blocks every case and cannot pass conformance", async () => {
  const p = plan(),
    r = await run();
  assert.equal(r.total, p.case_count);
  assert.equal(r.summary.BLOCKED, r.total);
  assert.equal(r.full_conformance, false);
  assert.equal(r.summary.PASS, 0);
});
test("A2A 1.0 uses raw canonical bytes and explicit role enum", () => {
  const i = {
    kind: "command",
    command: { expectedRevision: 6, commandId: "abc" },
  };
  const e = envelope(i);
  assert.equal(e.params.message.role, "ROLE_USER");
  assert(!("data" in e.params.message.parts[0]));
  assert.deepEqual(
    JSON.parse(Buffer.from(e.params.message.parts[0].raw, "base64")),
    i,
  );
  assert.equal(e.method, "SendMessage");
});
test("no fixture spend and missing role identities remain blocked", async () => {
  const r = await run({
    transport: {},
    fixture: {},
    proofVerifier: () => {},
    allowSpend: false,
  });
  assert.equal(r.summary.BLOCKED, r.total);
  assert.equal(r.full_conformance, false);
});
test("transport enforces response correlation and HTTPS", async () => {
  assert.throws(() => new Transport("http://runtime.example"));
  const transport = new Transport("https://runtime.example", async () => ({
    ok: true,
    json: async () => ({ id: "wrong" }),
  }));
  await assert.rejects(transport.send({ kind: "status", dealId: "d" }), {
    code: "rpc_id_mismatch",
  });
});
test("fixture driver refuses missing signed formation and unbounded funding", async () => {
  const fixture = new SignedFixtureDriver({
    one: { maximum_cost_base_units: "10", formation: [] },
  });
  await assert.rejects(
    fixture.prepare({ id: "one" }, { budgetBaseUnits: "5" }),
    { code: "fixture_budget_exhausted" },
  );
  await assert.rejects(
    fixture.prepare({ id: "one" }, { budgetBaseUnits: "20" }),
    { code: "fixture_formation_required" },
  );
  const payload = {
    kind: "agreement-status",
    status: { state: "COMMITTED", revision: 1 },
  };
  assert.deepEqual(
    decoded({
      result: {
        message: {
          parts: [
            {
              mediaType:
                "application/vnd.gokite.agreement-command+json;version=1",
              raw: Buffer.from(JSON.stringify(payload)).toString("base64"),
            },
          ],
        },
      },
    }),
    payload,
  );
});
