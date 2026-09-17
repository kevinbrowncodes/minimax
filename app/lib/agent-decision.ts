/**
 * What happens to a director's reply (STORY_051): with Confirm before generating = "always" every reply is reviewed in
 * the composer; with "never" a clean single prompt is queued at once, a reply with findings is reviewed (the strip
 * reads "Not sent —"), a chain (STORY_053) is reviewed until 053's all-clean rule, and a refusal or an error is shown.
 * One function, one table, so the rule is never a branch in JSX.
 */
import type { AgentConfirm } from "./settings";
import type { AgentRunResult } from "./submit-job";

export type AgentDecision = "queue" | "review" | "review-not-sent" | "alert" | "stopped";

export function decide(setting: AgentConfirm, result: AgentRunResult): AgentDecision {
  if (result.kind === "stopped") return "stopped";
  if (result.kind !== "prompt") return "alert";
  if (setting === "always") return "review";
  if (result.findings.length > 0 || result.segments > 1) return "review-not-sent";
  return "queue";
}
