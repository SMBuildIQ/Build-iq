import { NextRequest } from "next/server";
import { ensureOwnedProject, getSession } from "@/lib/auth";
import { BOT_ROSTER, runBotPipeline, type BotEvent } from "@/lib/ai/bots";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const user = await getSession();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  return Response.json({ bots: BOT_ROSTER });
}

/** SSE stream — AI bots run the full post-upload pipeline */
export async function POST(req: NextRequest, ctx: Ctx) {
  const user = await getSession();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await ctx.params;
  try {
    await ensureOwnedProject(id, user.companyId);
  } catch {
    return new Response(JSON.stringify({ error: "Project not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const fillCart = body.fillCart !== false;
  const syncSpruce = body.syncSpruce !== false;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: BotEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        await runBotPipeline(id, user.companyId, send, { fillCart, syncSpruce });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Bot pipeline failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
