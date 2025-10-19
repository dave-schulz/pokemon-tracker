// src/notify.ts
import axios from "axios";
import { Product } from "./types";

// Webhook URLs loaded from the .env file
const WEBHOOK_NEW = process.env.WEBHOOK_NEW!;
const WEBHOOK_PRICE = process.env.WEBHOOK_PRICE!;
const WEBHOOK_RESTOCK = process.env.WEBHOOK_RESTOCK!;

/**
 * Helper function to send messages to a Discord webhook.
 */
async function sendDiscordMessage(webhookUrl: string, embeds: any[], plainTextFallback?: string) {
  if (!webhookUrl) {
    console.error("❌ No valid Discord webhook URL provided!");
    return;
  }

  try {
    if (embeds.length > 0) {
      // Discord allows a maximum of 10 embeds per message
      const batches = [];
      for (let i = 0; i < embeds.length; i += 10) {
        batches.push(embeds.slice(i, i + 10));
      }

      for (const batch of batches) {
        await axios.post(webhookUrl, { embeds: batch });
        await new Promise((r) => setTimeout(r, 700)); // small delay to avoid rate limits
      }
    } else if (plainTextFallback) {
      // Split plain text into chunks of 1900 chars (Discord limit)
      const chunks = plainTextFallback.match(/[\s\S]{1,1900}/g) || [];
      for (const chunk of chunks) {
        await axios.post(webhookUrl, { content: chunk });
        await new Promise((r) => setTimeout(r, 700));
      }
    }
  } catch (err: any) {
    console.error(`❌ Error sending message to Discord: ${err.message || err}`);
    if (err.response?.status) {
      console.error(`Discord responded with status ${err.response.status}:`, err.response.data);
    }
  }
}

/**
 * Builds a clean Discord embed for a product, including store name.
 */
function makeEmbed(p: Product, color: number, titlePrefix: string) {
  const storeName = p.store || "Onbekende winkel";

  return {
    title: `${titlePrefix} ${p.title}`,
    url: p.link,
    color,
    fields: [
      { name: "🛒 Winkel", value: storeName, inline: true },
      { name: "💰 Prijs", value: p.price || "Onbekend", inline: true },
      { name: "🔗 Link", value: `[Bekijk product](${p.link})`, inline: false },
    ],
    timestamp: new Date().toISOString(),
  };
}

/**
 * Sends Discord notification for new products.
 */
export async function notifyNew(products: Product[]) {
  if (!products.length) return;

  const embeds = products.map((p) => makeEmbed(p, 0x2ecc71, "🆕 Nieuw:"));
  const fallback = products
    .map((p) => `🆕 **${p.title}** (${p.store || "onbekend"})\n💰 ${p.price}\n🔗 ${p.link}`)
    .join("\n\n");

  await sendDiscordMessage(WEBHOOK_NEW, embeds, fallback);
}

/**
 * Sends Discord notification for price drops.
 */
export async function notifyPriceDrops(products: Product[]) {
  if (!products.length) return;

  const embeds = products.map((p) => makeEmbed(p, 0xe74c3c, "💸 Prijsdaling:"));
  const fallback = products
    .map(
      (p) => `💸 **${p.title}** (${p.store || "onbekend"})\nNieuwe prijs: ${p.price}\n🔗 ${p.link}`,
    )
    .join("\n\n");

  await sendDiscordMessage(WEBHOOK_PRICE, embeds, fallback);
}

/**
 * Sends Discord notification when products are back in stock.
 */
export async function notifyRestocks(products: Product[]) {
  if (!products.length) return;

  const embeds = products.map((p) => makeEmbed(p, 0xf1c40f, "📦 Op voorraad:"));
  const fallback = products
    .map(
      (p) =>
        `📦 **${p.title}** is weer op voorraad! (${p.store || "onbekend"})\n💰 ${p.price}\n🔗 ${p.link}`,
    )
    .join("\n\n");

  await sendDiscordMessage(WEBHOOK_RESTOCK, embeds, fallback);
}
