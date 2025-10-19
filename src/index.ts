import { scrapePokemonProducts } from "./scraper";
import { loadProducts, saveProducts } from "./storage";

async function main() {
  console.log("Scraper is gestart!");

  const oldProducts = loadProducts();
  console.log(`Oude producten geladen: ${oldProducts.length}`);

  const newProducts = await scrapePokemonProducts();
  console.log(`Nieuwe producten geladen: ${newProducts.length}`);

  const oldLinks = new Set(oldProducts.map((p) => p.link));
  const freshProducts = newProducts.filter((p) => !oldLinks.has(p.link));

  if (freshProducts.length > 0) {
    console.log(`✨ ${freshProducts.length} nieuwe producten gevonden!\n`);
    freshProducts.forEach((p) => console.log(`• ${p.title}\n  💰 ${p.price}\n  🔗 ${p.link}\n`));
  } else {
    console.log("📭 Geen nieuwe producten sinds de laatste run.");
  }

  saveProducts(newProducts);
}

main();
