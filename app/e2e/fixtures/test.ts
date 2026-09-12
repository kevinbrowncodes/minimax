import { test as base, expect } from "@playwright/test";
import { stub, type StubScript } from "./stub";

/**
 * The shared `test` for every spec: the stub is reset before each test, and after each test no job may still be
 * running (CLAUDE.md §6b — a test must not end with a job still running).
 */
export const test = base.extend<{ stubApi: ReturnType<typeof stub> }>({
  stubApi: async ({ request }, provide) => {
    const api = stub(request);
    await api.reset();
    await provide(api);
    const open = await api.openJobs();
    expect(open, "a spec ended with a job still running").toEqual([]);
  },
});
export { expect };
export type { StubScript };
