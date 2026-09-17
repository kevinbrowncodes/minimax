/**
 * STORY_047: the guard for the credential — the repo's .gitignore must keep spark/data/ (the gcloud login and the
 * service-account key live under it), .env and .env.* (the project id and region), and still let .env.example through.
 * A source-text guard: it reads the file, so a later edit that drops an entry fails here before a push.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const lines = readFileSync(path.resolve(__dirname, "../../.gitignore"), "utf8").split(/\r?\n/).map((l) => l.trim());

describe(".gitignore keeps the secrets out", () => {
  it.each(["spark/data/", ".env", ".env.*"])("lists %s", (entry) => {
    expect(lines).toContain(entry);
  });
  it("keeps .env.example in", () => {
    expect(lines).toContain("!.env.example");
  });
});
