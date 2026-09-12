/** Join class names, skipping falsy ones. CSS-module lookups are `string | undefined` under noUncheckedIndexedAccess. */
export function cx(...parts: readonly (string | false | null | undefined)[]): string {
  return parts.filter((p): p is string => typeof p === "string" && p !== "").join(" ");
}
