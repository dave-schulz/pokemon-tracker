import { Page } from "playwright";
import { safePageLoad } from "./safePageLoad";

/**
 * 🔍 Checks whether a product is in stock by visiting its detail page.
 * Supports multiple languages and store wording patterns.
 */
export async function checkProductDetailStock(page: Page, url: string): Promise<boolean> {
  try {
    const ok = await safePageLoad(page, url);
    if (!ok) return false;

    const bodyText = (await page.textContent("body"))?.toLowerCase() || "";

    // 🟥 Negative indicators (sold out / unavailable)
    const soldOut = [
      "uitverkocht",
      "tijdelijk niet leverbaar",
      "niet op voorraad",
      "niet beschikbaar",
      "sold out",
      "currently unavailable",
    ];

    // 🟩 Positive indicators (available / deliverable)
    const available = [
      "op voorraad",
      "morgen in huis",
      "direct leverbaar",
      "leverbaar",
      "today",
      "available now",
    ];

    if (soldOut.some((t) => bodyText.includes(t))) return false;
    if (available.some((t) => bodyText.includes(t))) return true;

    // 🟨 Fallback: Try visible elements often used by stores
    const stockIndicator = await page
      .$eval("body", (b) => {
        const text = b.innerText.toLowerCase();
        if (text.includes("in stock") || text.includes("op voorraad")) return "available";
        if (text.includes("uitverkocht") || text.includes("niet beschikbaar")) return "soldout";
        return "unknown";
      })
      .catch(() => "unknown");

    if (stockIndicator === "available") return true;
    if (stockIndicator === "soldout") return false;

    // Default to false (we prefer false negatives over false positives)
    return false;
  } catch (err) {
    console.warn(`⚠️ Could not check stock for ${url}: ${(err as Error).message}`);
    return false;
  }
}
