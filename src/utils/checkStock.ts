import { Page } from "playwright";
import { safePageLoad } from "./safePageLoad";

/**
 * Checks whether a product is in stock by visiting its detail page.
 */
export async function checkProductDetailStock(page: Page, url: string): Promise<boolean> {
  try {
    const ok = await safePageLoad(page, url);
    if (!ok) return false;

    const bodyText = (await page.textContent("body"))?.toLowerCase() || "";

    const soldOut = [
      "uitverkocht",
      "tijdelijk niet leverbaar",
      "niet op voorraad",
      "niet beschikbaar",
    ];
    const available = ["op voorraad", "morgen in huis", "direct leverbaar"];

    if (soldOut.some((t) => bodyText.includes(t))) return false;
    if (available.some((t) => bodyText.includes(t))) return true;

    // Fallback: assume false if uncertain
    return false;
  } catch (err) {
    console.warn(`⚠️ Could not check stock for ${url}: ${(err as Error).message}`);
    return false;
  }
}
