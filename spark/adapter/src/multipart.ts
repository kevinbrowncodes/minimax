/** Multipart parser for POST /jobs — the same small parser as the stub's (tools/stub-generation-server/src/multipart.ts). */
export interface MultipartFile {
  readonly field: string;
  readonly filename: string;
  readonly contentType: string;
  readonly data: Buffer;
}
export interface MultipartBody {
  readonly fields: Readonly<Record<string, string>>;
  readonly files: readonly MultipartFile[];
}
export class MultipartError extends Error {
  readonly code: "malformed" | "too_large";
  constructor(code: "malformed" | "too_large", message: string) {
    super(message);
    this.name = "MultipartError";
    this.code = code;
  }
}
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_BODY_BYTES = 25 * 1024 * 1024;

export function boundaryOf(contentType: string | undefined): string | undefined {
  if (contentType === undefined) return undefined;
  const match = /^multipart\/form-data\s*;.*boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  return match?.[1] ?? match?.[2];
}

export function parseMultipart(body: Buffer, boundary: string): MultipartBody {
  if (body.length > MAX_BODY_BYTES) throw new MultipartError("too_large", `body exceeds ${String(MAX_BODY_BYTES)} bytes`);
  const delimiter = Buffer.from(`--${boundary}`);
  const fields: Record<string, string> = {};
  const files: MultipartFile[] = [];
  let cursor = body.indexOf(delimiter);
  if (cursor === -1) throw new MultipartError("malformed", "no opening boundary");
  for (;;) {
    cursor += delimiter.length;
    if (body.subarray(cursor, cursor + 2).toString() === "--") break;
    if (body.subarray(cursor, cursor + 2).toString() !== "\r\n") throw new MultipartError("malformed", "boundary not followed by CRLF");
    cursor += 2;
    const headerEnd = body.indexOf("\r\n\r\n", cursor);
    if (headerEnd === -1) throw new MultipartError("malformed", "part without header terminator");
    const headers = body.subarray(cursor, headerEnd).toString("utf8");
    const next = body.indexOf(delimiter, headerEnd + 4);
    if (next === -1) throw new MultipartError("malformed", "part without closing boundary");
    const data = body.subarray(headerEnd + 4, next - 2);
    cursor = next;
    const disposition = /content-disposition:\s*form-data;(.*)/i.exec(headers)?.[1] ?? "";
    const name = /name="([^"]*)"/.exec(disposition)?.[1];
    if (name === undefined) throw new MultipartError("malformed", "part without a field name");
    const filename = /filename="([^"]*)"/.exec(disposition)?.[1];
    if (filename === undefined) {
      fields[name] = data.toString("utf8");
    } else {
      if (data.length > MAX_FILE_BYTES) throw new MultipartError("too_large", `file ${filename} exceeds ${String(MAX_FILE_BYTES)} bytes`);
      const contentType = /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1]?.trim() ?? "application/octet-stream";
      files.push({ field: name, filename, contentType, data: Buffer.from(data) });
    }
  }
  return { fields, files };
}
