import { plan, run, Transport } from "./driver.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [command = "plan", ...args] = process.argv.slice(2);
const value = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
mkdirSync("reports", { recursive: true });
if (command === "plan") {
  const p = plan();
  writeFileSync("reports/plan.json", JSON.stringify(p, null, 2));
  console.log(`${p.case_count} normative cases from ${p.protocol_commit}`);
} else if (command === "run") {
  const fixturePath = value("--fixture");
  const plugins = fixturePath
    ? await import(pathToFileURL(resolve(fixturePath)))
    : {};
  const report = await run({
    transport: value("--runtime") ? new Transport(value("--runtime")) : null,
    fixture: plugins.fixture,
    proofVerifier: plugins.proofVerifier,
    roles: JSON.parse(process.env.A2A_ROLE_REFS || "{}"),
    allowSpend: args.includes("--allow-spend"),
    budgetBaseUnits: value("--budget-base-units") || "0",
  });
  writeFileSync("reports/report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary));
  if (!report.full_conformance) process.exitCode = 1;
} else if (command === "report") {
  const r = JSON.parse(readFileSync("reports/report.json"));
  console.log(
    JSON.stringify(
      {
        total: r.total,
        summary: r.summary,
        full_conformance: r.full_conformance,
      },
      null,
      2,
    ),
  );
} else throw Error("Use plan, run or report");
