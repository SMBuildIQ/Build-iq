export type BotId =
  | "plan-reader"
  | "takeoff"
  | "estimate"
  | "bids"
  | "packages"
  | "spruce"
  | "briefing";

export type BotEvent = {
  type: "pipeline_start" | "bot_start" | "bot_progress" | "bot_done" | "pipeline_done" | "error";
  bot?: BotId;
  botName?: string;
  message: string;
  progress?: number;
  data?: Record<string, unknown>;
};

export const BOT_ROSTER: { id: BotId; name: string; role: string }[] = [
  { id: "plan-reader", name: "Plan Reader", role: "OCR + drawing vision scan of sheets" },
  { id: "takeoff", name: "Takeoff Bot", role: "Vision-grounded materials & quantities" },
  { id: "estimate", name: "Estimate Bot", role: "Builds cost rollup" },
  { id: "bids", name: "Bid Bot", role: "Creates trade bid packages" },
  { id: "packages", name: "Package Bot", role: "Loads shop cart from takeoff" },
  { id: "spruce", name: "Spruce Bot", role: "Syncs pricing & quote prep" },
  { id: "briefing", name: "Briefing Bot", role: "Summarizes next steps" },
];
