import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { canonical, hash, fault, clean } from "./store.mjs";
import { decoded } from "./fixtures.mjs";
export const protocolCommit = "cae0888dd6f94d4722a8509989ba45496a2d5e44";
export function plan(
  spec = JSON.parse(
    readFileSync(new URL("../spec/transitions.json", import.meta.url)),
  ),
) {
  const cases = [];
  const add = (category, data) =>
    cases.push({
      id:
        category +
        "-" +
        String(
          cases.filter((c) => c.category === category).length + 1,
        ).padStart(2, "0"),
      category,
      ...data,
    });
  for (const c of spec.legal || []) add("legal", c);
  for (const c of spec.selfLoops || [])
    for (const from of c.states) add("selfLoops", { ...c, from, to: from });
  for (const category of ["illegal", "actorBinding", "concurrency"])
    for (const c of spec[category] || []) add(category, c);
  if (spec.fundingDealIdentity) {
    const value = spec.fundingDealIdentity;
    for (const c of Array.isArray(value) ? value : value.cases || [value])
      add("fundingDealIdentity", c);
  }
  return {
    schema_version: 1,
    protocol_commit: protocolCommit,
    template: spec.template,
    case_count: cases.length,
    cases,
  };
}
export function envelope(interaction) {
  return {
    jsonrpc: "2.0",
    id: randomUUID(),
    method: "SendMessage",
    params: {
      message: {
        messageId: randomUUID(),
        role: "ROLE_USER",
        extensions: [
          "https://a2a.gokite.ai/extensions/coordination-workflow/v1",
        ],
        parts: [
          {
            raw: Buffer.from(canonical(interaction)).toString("base64"),
            mediaType:
              "application/vnd.gokite.agreement-command+json;version=1",
          },
        ],
      },
    },
  };
}
export class Transport {
  constructor(endpoint, fetcher = fetch) {
    const u = new URL(endpoint);
    if (u.protocol !== "https:") throw fault("runtime_https_required");
    Object.assign(this, { endpoint, fetcher });
  }
  async send(interaction) {
    const request = envelope(interaction);
    const response = await this.fetcher(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw fault("runtime_http_" + response.status, 502);
    const rpc = await response.json();
    if (rpc.id !== request.id) throw fault("rpc_id_mismatch", 502);
    return { request_hash: hash(request), response: rpc };
  }
}
export async function run({
  testPlan = plan(),
  transport,
  fixture,
  allowSpend = false,
  budgetBaseUnits = "0",
  roles = {},
  proofVerifier,
  source = "live",
} = {}) {
  const results = [];
  for (const c of testPlan.cases) {
    if (!transport || !fixture || !proofVerifier) {
      results.push({
        ...c,
        status: "BLOCKED",
        reason:
          "Real Runtime, signed role-specific fixture provider and pinned proof verifier are required",
        evidence_level: "E0",
      });
      continue;
    }
    if (
      !allowSpend ||
      !/^\d+$/.test(budgetBaseUnits) ||
      BigInt(budgetBaseUnits) <= 0n
    ) {
      results.push({
        ...c,
        status: "BLOCKED",
        reason: "No explicit fixture spend budget",
        evidence_level: "E0",
      });
      continue;
    }
    if (
      new Set(Object.values(roles)).size !== 3 ||
      !roles.buyer ||
      !roles.seller ||
      !roles.arbiter
    ) {
      results.push({
        ...c,
        status: "BLOCKED",
        reason: "Three distinct actor credential references required",
        evidence_level: "E0",
      });
      continue;
    }
    let resource;
    try {
      resource = await fixture.prepare(c, {
        transport,
        budgetBaseUnits,
        roles,
      });
      if (!resource?.dealId || (c.from && resource.state !== c.from))
        throw fault("fixture_from_state_not_established");
      const before = await transport.send({
        kind: "status",
        dealId: resource.dealId,
      });
      if (c.from && decoded(before).status?.state !== c.from)
        throw fault("runtime_initial_state_mismatch");
      // Runtime/deadline observations must be driven by the runtime operator fixture, never a fabricated party command.
      const observation = await fixture.execute(c, {
        transport,
        resource,
        roles,
      });
      if (
        !observation?.assertions?.length ||
        !observation.assertions.every((x) => x.passed === true)
      )
        throw fault("case_assertions_failed");
      const after = await transport.send({
        kind: "status",
        dealId: resource.dealId,
      });
      if (
        ["legal", "selfLoops"].includes(c.category) &&
        decoded(after).status?.state !== c.to
      )
        throw fault("runtime_destination_state_mismatch");
      if (
        ["illegal", "actorBinding"].includes(c.category) &&
        hash(decoded(before).status) !== hash(decoded(after).status)
      )
        throw fault("runtime_rejected_command_changed_state");
      const proofs = await fixture.captureProofs(resource, {
        transport,
        roles,
      });
      const checked = await proofVerifier(proofs);
      if (checked.valid !== true) throw fault("proof_chain_invalid");
      results.push({
        ...c,
        status: "PASS",
        evidence_level: source === "live" ? "E2" : "E1",
        evidence_source: source,
        deal_ref: hash(resource.dealId),
        before: clean(before),
        after: clean(after),
        observation: clean(observation),
        proof_digest: hash(proofs),
        proof_validation: checked,
      });
    } catch (e) {
      results.push({
        ...c,
        status: e.code?.includes("fixture") ? "BLOCKED" : "FAIL",
        reason: e.code || "runtime_or_fixture_error",
        evidence_source: source,
      });
    } finally {
      if (resource) {
        try {
          await fixture.cleanup(resource, { transport });
        } catch {
          results.at(-1).cleanup = "MANUAL_REVIEW_REQUIRED";
        }
      }
    }
  }
  return {
    protocol_commit: testPlan.protocol_commit,
    observed_at: new Date().toISOString(),
    source,
    total: results.length,
    results,
    full_conformance:
      source === "live" &&
      testPlan.protocol_commit === protocolCommit &&
      testPlan.cases.length === plan().case_count &&
      new Set(testPlan.cases.map((c) => c.id)).size === plan().case_count &&
      plan().cases.every((c) =>
        testPlan.cases.some(
          (item) => item.id === c.id && hash(item) === hash(c),
        ),
      ) &&
      results.length > 0 &&
      results.every((r) => r.status === "PASS"),
    summary: Object.fromEntries(
      ["PASS", "FAIL", "BLOCKED"].map((status) => [
        status,
        results.filter((r) => r.status === status).length,
      ]),
    ),
  };
}
