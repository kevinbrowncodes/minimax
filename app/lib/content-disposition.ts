/**
 * The Content-Disposition header for a served video (BUG_004): the file name every browser saves, whatever it does
 * with an anchor's `download` attribute. `inline` keeps the player working; `attachment` forces a save with that name.
 * The plain `filename` is ASCII (RFC 6266); non-ASCII titles ride in `filename*` (RFC 5987, UTF-8, percent-encoded).
 */
export type Disposition = "inline" | "attachment";

/** RFC 5987 attr-char: what encodeURIComponent leaves alone, minus the four it keeps that the RFC does not allow. */
function rfc5987(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** The ASCII form may carry neither quotes, backslashes, control characters nor anything outside printable ASCII. */
function asciiName(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x20 && code < 0x7f && ch !== '"' && ch !== "\\") out += ch;
  }
  return out.trim() || "video.mp4";
}

export function contentDisposition(fileName: string, kind: Disposition): string {
  return `${kind}; filename="${asciiName(fileName)}"; filename*=UTF-8''${rfc5987(fileName)}`;
}
