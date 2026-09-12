import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES, MultipartError, boundaryOf, parseMultipart } from "./multipart.ts";

async function encode(form: FormData): Promise<{ body: Buffer; boundary: string }> {
  const request = new Request("http://stub/jobs", { method: "POST", body: form });
  const boundary = boundaryOf(request.headers.get("content-type") ?? undefined);
  if (boundary === undefined) throw new Error("no boundary");
  return { body: Buffer.from(await request.arrayBuffer()), boundary };
}

describe("parseMultipart", () => {
  it("parses text fields and two files from a real FormData encoding", async () => {
    const form = new FormData();
    form.set("prompt", "a paper boat");
    form.set("ratio", "16:9");
    form.append("referenceImage", new Blob([Buffer.from("PNG1")], { type: "image/png" }), "first.png");
    form.append("referenceImage", new Blob([Buffer.from("JPEG22")], { type: "image/jpeg" }), "last.jpg");
    const { body, boundary } = await encode(form);
    const parsed = parseMultipart(body, boundary);
    expect(parsed.fields).toEqual({ prompt: "a paper boat", ratio: "16:9" });
    expect(parsed.files.map((f) => [f.field, f.filename, f.contentType, f.data.toString()])).toEqual([
      ["referenceImage", "first.png", "image/png", "PNG1"],
      ["referenceImage", "last.jpg", "image/jpeg", "JPEG22"],
    ]);
  });

  it("rejects a file over the limit and a malformed body", async () => {
    const form = new FormData();
    form.append("referenceImage", new Blob([Buffer.alloc(MAX_FILE_BYTES + 1)], { type: "image/png" }), "big.png");
    const { body, boundary } = await encode(form);
    expect(() => parseMultipart(body, boundary)).toThrow(MultipartError);
    expect(() => parseMultipart(body, boundary)).toThrow(/too_large|exceeds/);
    expect(() => parseMultipart(Buffer.from("garbage"), "xyz")).toThrow(/no opening boundary/);
  });

  it("reads the boundary out of a content-type header, quoted or not", () => {
    expect(boundaryOf('multipart/form-data; boundary="abc"')).toBe("abc");
    expect(boundaryOf("multipart/form-data; boundary=----x1")).toBe("----x1");
    expect(boundaryOf("application/json")).toBeUndefined();
    expect(boundaryOf(undefined)).toBeUndefined();
  });
});
