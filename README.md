# A2A Live Driver

Spec-derived online coordination test plans and strict blocked reporting.

Version 0.1.0 is an AI-assisted engineering evaluation release, developed under one operator and assigned to this GitHub account. It is not evidence of independent human adoption, official Kite approval, Electric Capital inclusion or successful live payment.

## Run and verify

Node.js 20.11+ is required.

```sh
npm ci
npm test
node src/main.mjs plan
# Without Runtime this reports BLOCKED and exits 1:
node src/main.mjs run
node src/main.mjs report
```

The CLI derives every normative legal, illegal, actor-binding, concurrency, self-loop and funding-identity case from the pinned transitions document; no denominator is hardcoded. Transport emits A2A 1.0 SendMessage with canonical raw base64 Parts and correlates response IDs. SignedFixtureDriver submits real proposal/acceptance/funding/delivery recipes and waits for Runtime-observed states. Runtime/deadline events are never fabricated as party commands.

For live execution, the Runtime operator must supply signed per-case recipes through A2A_SIGNED_RECIPES_FILE, a pinned clean spec checkout through A2A_SPEC_CHECKOUT, three distinct A2A_ROLE_REFS and a bounded authorized budget. See examples/runtime-fixture.mjs. Each recipe has maximum_cost_base_units, formation interactions, attempts and a signed proofs_envelope. Official proof validation runs against the fixed checkout; no new signature algorithm is introduced.

Example: node src/main.mjs run --runtime https://YOUR-RUNTIME --fixture examples/runtime-fixture.mjs --allow-spend --budget-base-units YOUR_APPROVED_LIMIT

No Runtime, role credentials or signed funding fixtures were provided in this release. Every online case is BLOCKED. This is a runnable driver and fixture framework with local contract tests, not completed online conformance. Deadline/funding observation adapters remain runtime-specific and must be independently reviewed.

## Configuration and recovery

The stored payment state UNKNOWN never means unpaid. Inspect the original receipt/activity and restricted journal; do not change an operation key to buy again. Where a writer lock survives a crash, stop all writer processes and review the journal before removing only the stale lock directory.

## Integration evidence

Read [compatibility.json](compatibility.json) and [the protocol boundary](docs/PROTOCOL.md). Local tests are E1; read-only public capability/RPC observations prove only the facts observed. Real Passport approval, funded purchase, SIWX interoperability, public deployment and catalog/EC review are not completed by this release. 

## Scope and evidence

[Original PRD](docs/PRD.md) describes the full target, not a claim that every external acceptance gate has passed. [Event contract](docs/EVENTS.md) defines the application records. The standalone repositories share protocol/storage support code, with distinct business implementations and tests. The license is MIT; third-party dependencies keep their upstream licenses. Reproduce failures without publishing payment signatures, account credentials or private files.
