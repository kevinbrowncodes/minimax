/**
 * Pure helpers for the behaviour recon (STORY_027): what the run performs on the owner's account and undoes, how a
 * request body is redacted before it is logged, and how a run's network events are summarised per action.
 */
import { placeholderIds, type NetworkEvent } from "./network-log.ts";

/** The names the run creates, so a rerun (or the owner) can find and remove them. */
export const RECON_PROJECT = "Recon test project";
export const RECON_AGENT = "Recon test agent";
export const RENAME_SUFFIX = " (recon rename)";

export type ActionId =
  | "recents-rename"
  | "recents-pin"
  | "recents-copy-id"
  | "recents-archive"
  | "project-create"
  | "project-move"
  | "project-delete"
  | "assets-star"
  | "assets-upload"
  | "manage-tabs"
  | "manage-agents"
  | "manage-create-agent"
  | "attach-skills"
  | "attach-env"
  | "preview-more"
  | "connect-mobile"
  | "product-start"
  | "settings-preferences"
  | "inbox"
  | "chat";

export type Action = {
  id: ActionId;
  surface: string;
  /** True when the action changes the owner's account and the run must put it back. */
  changes: boolean;
  /** How the run puts it back (empty when nothing changes). */
  undo: string;
  /** Spends credits: only run with --chat. */
  credits?: boolean;
};

export const ACTIONS: readonly Action[] = [
  { id: "recents-rename", surface: "Recents ⋯ › Rename", changes: true, undo: "rename back to the original title through the same entry" },
  { id: "recents-pin", surface: "Recents ⋯ › Pin", changes: true, undo: "the same entry again (Unpin)" },
  { id: "recents-copy-id", surface: "Recents ⋯ › Copy conversation ID", changes: false, undo: "" },
  { id: "recents-archive", surface: "Recents ⋯ › Archive, Settings › Archived tasks", changes: true, undo: "restore from Settings › Archived tasks" },
  { id: "project-create", surface: "Projects › Add new project › Create", changes: true, undo: "project-delete" },
  { id: "project-move", surface: "Recents ⋯ › Move to project, + › Add to project with a project present", changes: false, undo: "" },
  { id: "project-delete", surface: "the test project's own menu › Delete", changes: true, undo: "is the undo of project-create" },
  { id: "assets-star", surface: "Assets tile ⋯ › Star, the Star tab", changes: true, undo: "the same entry again (Unstar)" },
  { id: "assets-upload", surface: "+ › Add files or photos → Assets › From you / Images", changes: true, undo: "the uploaded tile's ⋯ › Delete" },
  { id: "manage-tabs", surface: "Plugins › Manage: Plugins / Skills / Apps tabs", changes: false, undo: "" },
  { id: "manage-agents", surface: "Plugins › Manage › Agents: Coder and Verifier in the editor", changes: false, undo: "" },
  { id: "manage-create-agent", surface: "Plugins › Manage › Agents › Create agent, Save, More actions › Delete", changes: true, undo: "the agent's More actions › Delete" },
  { id: "attach-skills", surface: "+ › Skills › Manage skills / Add skill", changes: false, undo: "" },
  { id: "attach-env", surface: "+ › Environment variables", changes: false, undo: "" },
  { id: "preview-more", surface: "the finished task's preview pane ⋯", changes: false, undo: "" },
  { id: "connect-mobile", surface: "Connect mobile: Create IM Bot, Connect with an empty token", changes: false, undo: "" },
  { id: "product-start", surface: "MaxHermes / MaxClaw › Start now", changes: false, undo: "" },
  { id: "settings-preferences", surface: "Settings › General › Preferences switches", changes: true, undo: "each switch toggled back" },
  { id: "inbox", surface: "the Inbox bell", changes: false, undo: "" },
  { id: "chat", surface: "one text turn to MiniMax-M3", changes: true, undo: "the session is left (it is the owner's record); credits are spent", credits: true },
];

const SECRET_KEY = /token|secret|cookie|auth|password|session_key|api_key|accesskey|access_key|signature|policy|credential|uid|user_id|device_id|fingerprint/i;

/** A request body with secret-looking keys blanked and long ids replaced by placeholders; strings are cut to 400 chars. */
export function redactBody(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[…]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redactBody(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = SECRET_KEY.test(k) ? "<redacted>" : redactBody(v, depth + 1);
    return out;
  }
  if (typeof value === "string") return placeholderIds(value.replace(/\b\d{12,}\b/g, ":id")).slice(0, 400);
  return value;
}

export type CallSummary = { method: string; path: string; count: number; statuses: number[] };

/** The reference's API calls in a slice of the log, grouped by method + path, in first-seen order. */
export function summarizeCalls(events: readonly NetworkEvent[], host = "agent.minimax.io"): CallSummary[] {
  const out: CallSummary[] = [];
  for (const e of events) {
    if (e.kind !== "response" || e.host !== host || !e.path.includes("/api/")) continue;
    const found = out.find((c) => c.method === e.method && c.path === e.path);
    if (found) {
      found.count += 1;
      if (e.status !== undefined && !found.statuses.includes(e.status)) found.statuses.push(e.status);
    } else out.push({ method: e.method, path: e.path, count: 1, statuses: e.status === undefined ? [] : [e.status] });
  }
  return out;
}

/** The actions a run performs: all of them, or those whose id matches `only`; the credit-spending one only when asked. */
export function selectActions(only: RegExp | null, chat: boolean): Action[] {
  return ACTIONS.filter((a) => (only ? only.test(a.id) : true) && (a.credits ? chat : true));
}

/** A run's manifest merged over the day's: actions are replaced by id, the rest kept in plan order (STORY_027's reruns). */
export function mergeActions<T extends { id: ActionId }>(previous: readonly T[], current: readonly T[]): T[] {
  const byId = new Map<ActionId, T>();
  for (const a of previous) byId.set(a.id, a);
  for (const a of current) byId.set(a.id, a);
  return ACTIONS.map((def) => byId.get(def.id)).filter((a): a is T => a !== undefined);
}
