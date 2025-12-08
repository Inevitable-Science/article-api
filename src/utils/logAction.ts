import z from "zod";
import { ENV } from "./env";

export const EmbedZ = z.object({
  title: z.string().max(256).optional(),
  description: z.string().max(4096).optional(),
  author: z.object({
    name: z.string(),
    icon_url: z.string().optional(),
  }).optional(),
  fields: z
    .array(
      z.object({
        name: z.string().max(256),
        value: z.string().max(1024),
        inline: z.boolean().optional(),
      })
    )
    .optional(),
});

export type Embed = z.infer<typeof EmbedZ>;

async function logAction({ action, message, embed }: { action: "logError" | "logAction", message?: string, embed?: Embed }) {
  try {
    let color;
    if (action === "logError") {
      color = 12520460;
    } else {
      color = 2236962;
    };

    const webhook = ENV.DISCORD_WEBHOOK_URL;
    const payload: any = {};

    if (embed) {
      const footer = {
        text: "Article API",
        icon_url: "https://cdn.inevitable.science/static/img/branding/manifest/android-chrome-192x192.png"
      };

      const constructedEmbedd = { ...embed, color, footer };
      payload.embeds = [constructedEmbedd]; // Discord expects an array of embeds
    } else if (message) {
      payload.content = message;
    } else {
      return;
    };

    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

  } catch (error) {
    console.error("Error sending message to Discord:", error);
  } finally {
    return;
  }
};

export default logAction;
