import axios from "axios";
import { Product } from "./types";

// Webhook URLs loaded from the .env file
const WEBHOOK_NEW = process.env.WEBHOOK_NEW!;
const WEBHOOK_PRICE = process.env.WEBHOOK_PRICE!;
const WEBHOOK_RESTOCK = process.env.WEBHOOK_RESTOCK!;

/**
 * Sends formatted messages or embeds to a Discord webhook.
 */
async function sendDiscordMessage(webhookUrl: string, embeds: any[], plainTextFallback?: string) {
  if (!webhookUrl) {
    console.error("❌ No valid Discord webhook URL provided!");
    return;
  }

  try {
    if (embeds.length > 0) {
      const batches = [];
      for (let i = 0; i < embeds.length; i += 10) {
        batches.push(embeds.slice(i, i + 10));
      }
      for (const batch of batches) {
        await axios.post(webhookUrl, { embeds: batch });
        await new Promise((r) => setTimeout(r, 700));
      }
    } else if (plainTextFallback) {
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
 * Creates a styled Discord embed for product notifications.
 */
function makeEmbed(
  p: Product,
  color: number,
  titlePrefix: string,
  context: "new" | "price" | "restock",
) {
  const storeName = p.store || "Onbekende winkel";

  // 💰 Build dynamic description with proper Markdown
  let description = "";
  if (context === "price" && p.oldPrice && p.oldPrice !== p.price) {
    description = `~~${p.oldPrice}~~ ➜ **${p.price}**\n📉 De prijs is verlaagd — profiteer snel!`;
  } else if (context === "new") {
    description = `💰 **${p.price}**\n✨ Nieuw Pokémon-product in de shop!`;
  } else if (context === "restock") {
    description = `💰 **${p.price}**\n📦 Dit product is weer op voorraad!`;
  } else {
    description = `💰 **${p.price || "Onbekend"}**`;
  }

  return {
    title: `${titlePrefix} ${p.title}`,
    url: p.link,
    color,
    description,
    fields: [
      { name: "🛒 Winkel", value: storeName, inline: true },
      { name: "🔗 Productlink", value: `[Bekijk hier](${p.link})`, inline: false },
    ],
    footer: { text: "Pokémon Tracker • Automatisch bijgewerkt" },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 🔔 Nieuwe producten.
 */
export async function notifyNew(products: Product[]) {
  if (!products.length) return;
  const embeds = products.map((p) => makeEmbed(p, 0x2ecc71, "🆕 Nieuw product:", "new"));
  await sendDiscordMessage(WEBHOOK_NEW, embeds);
}

/**
 * 💸 Prijsdalingen (met oude prijs doorgestreept).
 */
export async function notifyPriceDrops(products: Product[]) {
  if (!products.length) return;
  const embeds = products.map((p) => makeEmbed(p, 0xe74c3c, "💸 Prijsdaling:", "price"));
  await sendDiscordMessage(WEBHOOK_PRICE, embeds);
}

/**
 * 📦 Weer op voorraad.
 */
export async function notifyRestocks(products: Product[]) {
  if (!products.length) return;
  const embeds = products.map((p) => makeEmbed(p, 0xf1c40f, "📦 Weer op voorraad:", "restock"));
  await sendDiscordMessage(WEBHOOK_RESTOCK, embeds);
}
