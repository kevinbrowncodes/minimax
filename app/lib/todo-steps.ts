/** The Progress panel's fixed steps (STORY_014): a job's state → four steps with a tick, an active one or a failure. */
import type { JobSnapshot } from "./job-status";

export type StepState = "done" | "active" | "pending" | "failed";
export interface Step {
  readonly label: string;
  readonly state: StepState;
  readonly detail?: string;
}

export function stepsFor(job: Pick<JobSnapshot, "status" | "progress" | "error">): readonly Step[] {
  const failed = job.status === "failed" || job.status === "cancelled";
  const generate: Step =
    job.status === "done"
      ? { label: "Generate the video", state: "done" }
      : failed
        ? { label: "Generate the video", state: "failed", detail: job.status === "cancelled" ? `Cancelled at ${String(job.progress)} %` : job.error?.message }
        : job.status === "running"
          ? { label: "Generate the video", state: "active", detail: `${String(job.progress)} %` }
          : { label: "Generate the video", state: "active", detail: "Queued" };
  const deliver: Step = job.status === "done" ? { label: "Deliver the video", state: "done" } : { label: "Deliver the video", state: failed ? "pending" : "pending" };
  return [
    { label: "Validate the request", state: "done" },
    { label: "Submit to the Spark", state: "done" },
    generate,
    deliver,
  ];
}

/** The working indicator's text (task-generating-*@1440 show the agent's; ours shows the job's). */
/** "1st", "2nd", "3rd", "4th"… for the queue's position (STORY_041). */
export function ordinal(n: number): string {
  const rem100 = n % 100;
  const suffix = rem100 >= 11 && rem100 <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${String(n)}${suffix}`;
}

export function indicatorFor(job: Pick<JobSnapshot, "status" | "progress" | "error" | "position">): string {
  switch (job.status) {
    case "queued":
      return job.position === undefined ? "Queued…" : `Waiting — ${ordinal(job.position)} in line`; // STORY_041: still in the app's queue
    case "running":
      return `Generating… ${String(job.progress)} %`;
    case "done":
      return "Your video is ready";
    case "cancelled":
      return `Cancelled at ${String(job.progress)} %`;
    case "failed":
      return job.error?.code === "moderated" ? "The prompt was refused on content grounds" : job.error?.code === "unreachable" ? "The Spark stopped answering" : "Request failed";
  }
}
