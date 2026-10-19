import { readFileSync } from "node:fs";
import { SignedFixtureDriver } from "../src/fixtures.mjs";
import { officialProofVerifier } from "../src/proof-check.mjs";
// A runtime operator provides correctly signed interaction recipes for each normative case.
// Each recipe reserves its declared maximum cost from the run's shared budget.
export const fixture = new SignedFixtureDriver(
  JSON.parse(readFileSync(process.env.A2A_SIGNED_RECIPES_FILE)),
);
export const proofVerifier = officialProofVerifier({
  checkout: process.env.A2A_SPEC_CHECKOUT,
  python: process.env.PYTHON || "python3",
});
