# Changes

## 0.2.0 — 2026-10-28

node src/main.mjs doctor --runtime https://YOUR-RUNTIME --budget-base-units YOUR_LIMIT checks configuration without sending any network request. A2A_ROLE_REFS, A2A_SPEC_CHECKOUT and A2A_SIGNED_RECIPES_FILE must point to reviewed operator resources. Doctor checks recipe coverage and budget declarations, not signatures, authorization or successful runtime behavior. The runner now independently checks observed initial/destination states and rejected-command immutability; a fixture's passed=true assertion cannot override an inconsistent Runtime. Full conformance also requires the complete pinned plan. The official verifier checkout must be clean, including helper files. The 36 online cases remain blocked until an actual Runtime, roles and signed fixtures are supplied.

This evaluation update retains explicit blocked real-payment, public-hosting and official-listing gates. Prior releases remain available.
