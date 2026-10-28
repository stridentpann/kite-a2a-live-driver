import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { protocolCommit } from "./driver.mjs";
export function officialProofVerifier({ checkout, python = "python3" }) {
  const root = resolve(checkout);
  return async (proofs) => {
    const commit = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    if (commit !== protocolCommit)
      return { valid: false, reason: "protocol_commit_mismatch" };
    if (
      execFileSync(
        "git",
        ["-C", root, "status", "--porcelain", "--untracked-files=all"],
        { encoding: "utf8" },
      ).trim()
    )
      return { valid: false, reason: "dirty_verifier_checkout" };
    const local = readFileSync(join(root, "conformance/run.py"));
    const committed = execFileSync("git", [
      "-C",
      root,
      "show",
      `${protocolCommit}:conformance/run.py`,
    ]);
    if (!local.equals(committed))
      return { valid: false, reason: "modified_verifier" };
    const dir = mkdtempSync(join(tmpdir(), "a2a-proof-"));
    try {
      const file = join(dir, "proofs.json");
      writeFileSync(file, JSON.stringify(proofs), { mode: 0o600 });
      const result = execFileSync(
        python,
        ["conformance/run.py", "--proofs-file", file],
        { cwd: root, encoding: "utf8", timeout: 60000, maxBuffer: 1000000 },
      );
      return {
        valid: true,
        verifier_commit: commit,
        output_sha256: createHash("sha256").update(result).digest("hex"),
        scope: "captured_proof_chain_only_not_full_online_conformance",
      };
    } catch {
      return {
        valid: false,
        reason: "official_verifier_failed_or_dependencies_missing",
      };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
}
