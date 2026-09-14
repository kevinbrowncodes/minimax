import { describe, expect, it } from "vitest";
import { contentDisposition } from "./content-disposition";

describe("contentDisposition (BUG_004)", () => {
  it("names the file in both forms, inline or as an attachment", () => {
    expect(contentDisposition("A small paper boat.mp4", "inline")).toBe(`inline; filename="A small paper boat.mp4"; filename*=UTF-8''A%20small%20paper%20boat.mp4`);
    expect(contentDisposition("[000-003] From his stance, he draws.mp4", "attachment")).toBe(`attachment; filename="[000-003] From his stance, he draws.mp4"; filename*=UTF-8''%5B000-003%5D%20From%20his%20stance%2C%20he%20draws.mp4`);
  });

  it("keeps the ASCII form safe and carries the rest in filename*", () => {
    expect(contentDisposition(`Café "one" (1)*.mp4`, "inline")).toBe(`inline; filename="Caf one (1)*.mp4"; filename*=UTF-8''Caf%C3%A9%20%22one%22%20%281%29%2A.mp4`);
    expect(contentDisposition("日本語.mp4", "attachment")).toBe(`attachment; filename=".mp4"; filename*=UTF-8''%E6%97%A5%E6%9C%AC%E8%AA%9E.mp4`);
    expect(contentDisposition("\t \t", "inline")).toBe(`inline; filename="video.mp4"; filename*=UTF-8''%09%20%09`);
  });
});
