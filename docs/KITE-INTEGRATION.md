# Kite integration — A2A Live Driver

Pinned Passport documentation: b005121f008c005fc94cf42b2d29e9a3aba2ec99. Service schema remains 893a27509648b660bbba626b0da59619a94f04ab; A2A remains cae0888dd6f94d4722a8509989ba45496a2d5e44.

node src/main.mjs doctor --runtime https://YOUR-RUNTIME --budget-base-units YOUR_LIMIT checks configuration without sending any network request. A2A_ROLE_REFS, A2A_SPEC_CHECKOUT and A2A_SIGNED_RECIPES_FILE must point to reviewed operator resources. Doctor checks recipe coverage and budget declarations, not signatures, authorization or successful runtime behavior. The runner now independently checks observed initial/destination states and rejected-command immutability; a fixture's passed=true assertion cannot override an inconsistent Runtime. Full conformance also requires the complete pinned plan. The official verifier checkout must be clean, including helper files. The 36 online cases remain blocked until an actual Runtime, roles and signed fixtures are supplied.

## Payment compatibility

The service schema allows Kite networks eip155:2366/2368 and the observed facilitator advertises both. Current Passport dev documentation lists Arc testnet; its advertised buyer-network list is not identical to that seller schema. Validate the exact installed CLI, Passport environment, asset, receiver and SIWX behavior before claiming interoperability. Facilitator support is not a completed Passport purchase. Do not silently change networks, payment sources or approved budgets.

Current account-allowance and separate-session flows must be handled separately. Create with a delegation can return allowance_available rather than an approval request; independent approval now has explicit --separate/--preview semantics. Never execute next_command as shell code. Keep the original Passport idempotency key for ambiguous payment outcomes, and use the original wallet/session for free recovery.

For services 07–10: configure and host a real public HTTPS origin, validate and export a non-placeholder manifest only after evidence exists, discover it through the actual catalog (or use the explicit operator URL while registration is pending), get an authorized Passport session/allowance, purchase once, then retrieve with the original wallet. Pass operation_id in the merchant body and keep Passport's idempotency key distinct. Record receipt, network, artifact hash and any job/result URL for the ledger. This is an operator workflow specification; this release has not executed a funded purchase.

## Portfolio integration

The intended workflow is Passport Runtime → Paid Jobs → a local document processor or a bounded browser service → Payment Ledger. Merchant Console manages configured sellers and x402 Testkit checks unsigned contracts and offline fault behavior. The A2A driver verifies a separate coordination Runtime. Keep independent repositories and evidence for each stage.

- 01: https://github.com/agitatedcrit/kite-dotnet-payments
- 02: https://github.com/sillygrief/kite-passport-runtime
- 03: https://github.com/assuredpens/kite-payment-ledger
- 04: https://github.com/ordinaryleggi/kite-merchant-console
- 05: https://github.com/legitimategro/kite-x402-testkit
- 06: https://github.com/stridentpann/kite-a2a-live-driver
- 07: https://github.com/windingbuff/kite-paid-jobs
- 08: https://github.com/inbornemu/kite-browser-api
- 09: https://github.com/artisticsmo/kite-document-api
- 10: https://github.com/agitatedcrit/kite-data-query

## Primary references

- https://github.com/gokite-ai/passport-skills/tree/b005121f008c005fc94cf42b2d29e9a3aba2ec99
- https://github.com/gokite-ai/kite-x402-services/tree/893a27509648b660bbba626b0da59619a94f04ab
- https://github.com/gokite-ai/a2a-coordination-extension/tree/cae0888dd6f94d4722a8509989ba45496a2d5e44
