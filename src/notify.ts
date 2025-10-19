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
 * Creates a clean, themed Discord embed for a product.
 */
function makeEmbed(p: Product, color: number, titlePrefix: string, description?: string) {
  const storeName = p.store || "Onbekende winkel";

  // If product has old price → show comparison
  const priceField =
    p.oldPrice && p.price && p.oldPrice !== p.price
      ? `~~${p.oldPrice}~~ ➜ **${p.price}**`
      : `**${p.price || "Onbekend"}**`;

  return {
    title: `${titlePrefix} ${p.title}`,
    url: p.link,
    color,
    description,
    fields: [
      { name: "🛒 Winkel", value: storeName, inline: true },
      { name: "💰 Prijs", value: priceField, inline: true },
      { name: "🔗 Productlink", value: `[Bekijk hier](${p.link})`, inline: false },
    ],
    footer: { text: "Pokémon Tracker • Automatisch bijgewerkt" },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 🔔 Meldt nieuwe producten.
 */
export async function notifyNew(products: Product[]) {
  if (!products.length) return;

  const embeds = products.map((p) =>
    makeEmbed(p, 0x2ecc71, "🆕 Nieuw product:", "Een nieuw Pokémon-product is toegevoegd!"),
  );

  const fallback = products
    .map(
      (p) =>
        `🆕 **${p.title}** (${p.store || "onbekend"})\n💰 **${p.price}**\n🔗 ${p.link}\n✨ Nieuw in de shop!`,
    )
    .join("\n\n");

  await sendDiscordMessage(WEBHOOK_NEW, embeds, fallback);
}

/**
 * 💸 Meldt prijsdalingen met oude prijs doorgestreept.
 */
export async function notifyPriceDrops(products: Product[]) {
  if (!products.length) return;

  const embeds = products.map((p) =>
    makeEmbed(
      p,
      0xe74c3c,
      "💸 Prijsdaling:",
      "De prijs van dit product is verlaagd! Grijp je kans 👇",
    ),
  );

  const fallback = products
    .map(
      (p) =>
        `💸 **${p.title}** (${p.store || "onbekend"})\n💰 ~~${p.oldPrice || "?"}~~ ➜ **${p.price}**\n🔗 ${p.link}`,
    )
    .join("\n\n");

  await sendDiscordMessage(WEBHOOK_PRICE, embeds, fallback);
}

/**
 * 📦 Meldt producten die weer op voorraad zijn.
 */
export async function notifyRestocks(products: Product[]) {
  if (!products.length) return;

  const embeds = products.map((p) =>
    makeEmbed(p, 0xf1c40f, "📦 Weer op voorraad:", "Dit product is opnieuw beschikbaar!"),
  );

  const fallback = products
    .map(
      (p) =>
        `📦 **${p.title}** is weer op voorraad! (${p.store || "onbekend"})\n💰 **${p.price}**\n🔗 ${p.link}`,
    )
    .join("\n\n");

  await sendDiscordMessage(WEBHOOK_RESTOCK, embeds, fallback);
}
