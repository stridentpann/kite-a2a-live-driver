import { fault, hash, canonical } from "./store.mjs";
const media = "application/vnd.gokite.agreement-command+json;version=1";
export function decoded(response) {
  const rpc = response.response || response;
  if (rpc.error)
    return {
      error:
        rpc.error.data?.code || rpc.error.data?.errorCode || rpc.error.message,
      rpc_error: rpc.error,
    };
  const parts = rpc.result?.message?.parts || [];
  const part = parts.find((p) => p.mediaType === media && p.raw);
  if (!part) throw fault("runtime_extension_raw_part_missing");
  try {
    return JSON.parse(Buffer.from(part.raw, "base64").toString());
  } catch {
    throw fault("runtime_extension_response_invalid");
  }
}
export class SignedFixtureDriver {
  constructor(
    recipes,
    {
      wait = (ms) => new Promise((r) => setTimeout(r, ms)),
      pollAttempts = 10,
    } = {},
  ) {
    Object.assign(this, { recipes, wait, pollAttempts });
    this.budgetUsed = 0n;
  }
  quote(c) {
    const r = this.recipes[c.id];
    if (!r) throw fault("fixture_recipe_missing");
    if (!/^\d+$/.test(r.maximum_cost_base_units || ""))
      throw fault("fixture_budget_missing");
    return r.maximum_cost_base_units;
  }
  async prepare(c, { transport, budgetBaseUnits }) {
    const recipe = this.recipes[c.id];
    if (!recipe) throw fault("fixture_recipe_missing");
    const cost = BigInt(this.quote(c));
    if (this.budgetUsed + cost > BigInt(budgetBaseUnits))
      throw fault("fixture_budget_exhausted");
    this.budgetUsed += cost;
    if (
      !Array.isArray(recipe.formation) ||
      !recipe.formation.some((x) => x.kind === "proposal") ||
      !recipe.formation.some((x) => x.kind === "acceptance")
    )
      throw fault("fixture_formation_required");
    let dealId = recipe.deal_id;
    for (const interaction of recipe.formation) {
      if (
        ![
          "proposal",
          "acceptance",
          "funding-signatures",
          "evidence",
          "command",
        ].includes(interaction.kind)
      )
        throw fault("fixture_unknown_interaction");
      if (interaction.kind === "command" && !interaction.command?.signature)
        throw fault("fixture_signed_command_required");
      const response = decoded(await transport.send(interaction));
      if (response.error) throw fault("fixture_formation_rejected");
      dealId ??= response.status?.dealId;
    }
    if (!dealId) throw fault("fixture_deal_id_missing");
    let status;
    for (let n = 0; n < this.pollAttempts; n++) {
      const reply = decoded(await transport.send({ kind: "status", dealId }));
      status = reply.status;
      if (status && (!c.from || status.state === c.from)) break;
      if (n + 1 < this.pollAttempts) await this.wait(1000);
    }
    if (!status || (c.from && status.state !== c.from))
      throw fault("fixture_from_state_not_established");
    return {
      dealId,
      state: status.state,
      revision: status.revision,
      recipe,
      budget_reserved: cost.toString(),
    };
  }
  async execute(c, { transport, resource }) {
    const r = resource.recipe,
      assertions = [],
      requests = [];
    const check = (name, passed) =>
      assertions.push({ name, passed: Boolean(passed) });
    if (!Array.isArray(r.attempts) || !r.attempts.length) {
      if (!["runtime", "deadline"].includes(c.driver))
        throw fault("fixture_case_attempts_missing");
      let status;
      for (let n = 0; n < this.pollAttempts; n++) {
        status = decoded(
          await transport.send({ kind: "status", dealId: resource.dealId }),
        ).status;
        if (status?.state === c.to) break;
        await this.wait(1000);
      }
      check("runtime_observed_expected_state", status?.state === c.to);
      return { assertions, driver: c.driver, status };
    }
    const before = decoded(
      await transport.send({ kind: "status", dealId: resource.dealId }),
    ).status;
    const replies = [];
    for (const attempt of r.attempts) {
      if (!["command", "funding-signatures"].includes(attempt.kind))
        throw fault("fixture_attempt_kind_invalid");
      if (attempt.kind === "command" && !attempt.command?.signature)
        throw fault("fixture_signed_command_required");
      const response = await transport.send(attempt);
      requests.push(response.request_hash);
      replies.push(decoded(response));
    }
    const after = decoded(
        await transport.send({ kind: "status", dealId: resource.dealId }),
      ).status,
      last = replies.at(-1);
    if (c.category === "legal" || c.category === "selfLoops")
      check("expected_destination", after?.state === c.to);
    if (c.category === "illegal") {
      check("illegal_transition_rejected", last.error === c.errorCode);
      check("state_unchanged", hash(before) === hash(after));
    }
    if (c.category === "actorBinding") {
      check("wrong_actor_rejected", Boolean(last.error));
      check("revision_unchanged", after?.revision === before?.revision);
    }
    if (c.category === "concurrency") {
      if (c.case === "identical-replay") {
        check(
          "two_identical_requests",
          r.attempts.length === 2 &&
            canonical(r.attempts[0]) === canonical(r.attempts[1]),
        );
        check(
          "original_result_returned",
          canonical(replies[0]) === canonical(replies[1]),
        );
        check("applied_once", after?.revision === before?.revision + 1);
      } else {
        check("expected_conflict", last.error === c.expect?.errorCode);
        if (c.case === "stale-revision")
          check("revision_unchanged", after?.revision === before?.revision);
      }
    }
    if (c.category === "fundingDealIdentity") {
      // Broadcast observation must be supplied by the Runtime's evidence hook, not inferred from a local boolean.
      if (!r.runtime_observation_envelope)
        throw fault("fixture_runtime_funding_observation_missing");
      const observation = decoded(
        await transport.send(r.runtime_observation_envelope),
      );
      check(
        "funding_observation_present",
        Array.isArray(observation.status?.transactionRefs),
      );
      check(
        "funding_identity_behavior",
        c.name === "match-accepted"
          ? observation.status?.transactionRefs?.length > 0
          : Boolean(last.error) &&
              observation.status?.transactionRefs?.length === 0,
      );
    }
    return {
      assertions,
      request_hashes: requests,
      responses: replies,
      before,
      after,
    };
  }
  async captureProofs(resource, { transport }) {
    const request = resource.recipe.proofs_envelope;
    if (
      !request ||
      request.kind !== "proofs" ||
      request.dealId !== resource.dealId ||
      !request.signature
    )
      throw fault("fixture_signed_proofs_envelope_missing");
    const p = decoded(await transport.send(request));
    if (p.kind !== "agreement-proofs" || !p.proofs?.length)
      throw fault("fixture_proofs_missing");
    return p;
  }
  async cleanup(resource) {
    return {
      status: "manual_funds_review",
      deal_ref: hash(resource.dealId),
      reason: "No automatic asset transfer or cleanup transaction",
    };
  }
}
