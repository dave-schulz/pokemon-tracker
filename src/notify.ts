import axios from "axios";
import type { StoredProduct } from "./storage";

// Webhook URLs from the .env file
const WEBHOOK_NEW = process.env.WEBHOOK_NEW!;
const WEBHOOK_PRICE = process.env.WEBHOOK_PRICE!;
const WEBHOOK_RESTOCK = process.env.WEBHOOK_RESTOCK!;

/**
 * Helper function to send message(s) to a Discord webhook.
 */
async function sendDiscordMessage(webhookUrl: string, embeds: any[], plainTextFallback?: string) {
  if (!webhookUrl) {
    console.error("❌ No valid Discord webhook URL provided!");
    return;
  }

  try {
    if (embeds.length > 0) {
      // Discord only allows up to 10 embeds per message
      const batches = [];
      for (let i = 0; i < embeds.length; i += 10) {
        batches.push(embeds.slice(i, i + 10));
      }

      for (const batch of batches) {
        await axios.post(webhookUrl, { embeds: batch });
        await new Promise((r) => setTimeout(r, 700)); // small delay to avoid rate limits
      }
    } else if (plainTextFallback) {
      // Fallback: split large plain text messages into 1900-character chunks
      const chunks = plainTextFallback.match(/[\s\S]{1,1900}/g) || [];
      for (const chunk of chunks) {
        await axios.post(webhookUrl, { content: chunk });
        await new Promise((r) => setTimeout(r, 700));
      }
    }
  } catch (err) {
    console.error("❌ Error sending message to Discord:", (err as Error).message);
  }
}

/**
 * Helper to create a clean Discord embed for a product.
 */
function makeEmbed(p: StoredProduct, color: number, titlePrefix: string) {
  return {
    title: `${titlePrefix} ${p.title}`,
    url: p.link,
    color,
    fields: [
      { name: "💰 Price", value: p.price || "Unknown", inline: true },
      { name: "🔗 Link", value: `[View on bol.com](${p.link})`, inline: true },
    ],
    timestamp: new Date().toISOString(),
  };
}

/**
 * Notify about new products.
 */
export async function notifyNew(products: StoredProduct[]) {
  if (!products.length) return;

  const embeds = products.map((p) => makeEmbed(p, 0x2ecc71, "🆕"));
  const fallback = products
    .map((p) => `🆕 **${p.title}**\n💰 ${p.price}\n🔗 ${p.link}`)
    .join("\n\n");

  await sendDiscordMessage(WEBHOOK_NEW, embeds, fallback);
}

/**
 * Notify about price drops.
 */
export async function notifyPriceDrops(products: StoredProduct[]) {
  if (!products.length) return;

  const embeds = products.map((p) => makeEmbed(p, 0xe74c3c, "💸"));
  const fallback = products
    .map((p) => `💸 **${p.title}**\nNew price: ${p.price}\n🔗 ${p.link}`)
    .join("\n\n");

  await sendDiscordMessage(WEBHOOK_PRICE, embeds, fallback);
}

/**
 * Notify when products are back in stock.
 */
export async function notifyRestocks(products: StoredProduct[]) {
  if (!products.length) return;

  const embeds = products.map((p) => makeEmbed(p, 0xf1c40f, "📦"));
  const fallback = products
    .map((p) => `📦 **${p.title}** is back in stock!\n💰 ${p.price}\n🔗 ${p.link}`)
    .join("\n\n");

  await sendDiscordMessage(WEBHOOK_RESTOCK, embeds, fallback);
}
