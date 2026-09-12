import { forward, guarded, relayJson } from "@/lib/model-client";

export const dynamic = "force-dynamic";

type Context = { readonly params: Promise<{ readonly id: string }> };

/** GET /api/jobs/:id — status. */
export function GET(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    return relayJson(await forward(`/jobs/${encodeURIComponent(id)}`));
  });
}

/** DELETE /api/jobs/:id — cancel. */
export function DELETE(_request: Request, context: Context): Promise<Response> {
  return guarded(async () => {
    const { id } = await context.params;
    return relayJson(await forward(`/jobs/${encodeURIComponent(id)}`, { method: "DELETE" }));
  });
}
