import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { plan, protocolCommit } from "./driver.mjs";

export function doctor({
  runtime,
  roles = {},
  checkout,
  recipesFile,
  budgetBaseUnits = "0",
} = {}) {
  const checks = [];
  const check = (name, ok, reason) =>
    checks.push({
      name,
      status: ok ? "READY" : "BLOCKED",
      reason: ok ? null : reason,
    });
  let validUrl = false;
  try {
    const u = new URL(runtime);
    validUrl = u.protocol === "https:" && !u.username && !u.password;
  } catch {}
  check(
    "runtime_url",
    validUrl,
    "Provide an operator-controlled HTTPS Runtime",
  );
  check(
    "role_references",
    ["buyer", "seller", "arbiter"].every(
      (k) => typeof roles[k] === "string" && roles[k].length > 0,
    ) && new Set([roles.buyer, roles.seller, roles.arbiter]).size === 3,
    "Provide three distinct actor credential references",
  );
  let clean = false;
  try {
    clean =
      execFileSync("git", ["-C", checkout, "rev-parse", "HEAD"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() === protocolCommit &&
      !execFileSync(
        "git",
        ["-C", checkout, "status", "--porcelain", "--untracked-files=all"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ).trim();
  } catch {}
  check(
    "pinned_verifier_checkout",
    clean,
    "Provide a clean checkout of the pinned official A2A specification",
  );
  let recipes = {};
  try {
    if (existsSync(recipesFile))
      recipes = JSON.parse(readFileSync(recipesFile, "utf8"));
  } catch {}
  const testPlan = plan();
  let reserved = 0n;
  for (const c of testPlan.cases) {
    const r = recipes[c.id];
    const ready = Boolean(
      r &&
      /^\d+$/.test(r.maximum_cost_base_units || "") &&
      Array.isArray(r.formation) &&
      r.formation.some((x) => x.kind === "proposal") &&
      r.formation.some((x) => x.kind === "acceptance"),
    );
    check(
      c.id,
      ready,
      "Provide a signed case-specific formation and bounded funding recipe",
    );
    if (ready) reserved += BigInt(r.maximum_cost_base_units);
  }
  check(
    "budget_limit",
    /^\d+$/.test(budgetBaseUnits) &&
      BigInt(budgetBaseUnits) > 0n &&
      BigInt(budgetBaseUnits) >= reserved,
    "Declare an authorized budget covering the supplied recipes; this command sends nothing",
  );
  return {
    observed_at: new Date().toISOString(),
    protocol_commit: protocolCommit,
    checks,
    ready: checks.every((c) => c.status === "READY"),
    network_requests_sent: 0,
    actual_spend: false,
    scope: "configuration_preflight_only_not_signature_or_runtime_validation",
  };
}
