import { Product } from "../types";

/**
 * Filters out non-Pokémon card products (e.g. sleeves, binders, accessories, etc.)
 * and only returns genuine Pokémon trading card listings.
 */
export function filterPokemonProducts<T extends Product>(products: T[]): T[] {
  return products.filter((product) => {
    const titleLower = product.title.toLowerCase();

    const hasPokemon = titleLower.includes("pokemon") || titleLower.includes("pokémon");

    const isAccessory =
      titleLower.includes("verzamelmap") ||
      titleLower.includes("binder") ||
      titleLower.includes("map voor") ||
      titleLower.includes("sleeves") ||
      titleLower.includes("toploader") ||
      titleLower.includes("hoesjes") ||
      titleLower.includes("portfolio") ||
      titleLower.includes("deckbox") ||
      titleLower.includes("display standaard") ||
      titleLower.includes("kaart houder") ||
      titleLower.includes("booster box display") ||
      titleLower.includes("tins") ||
      (titleLower.includes("elite trainer box") && !titleLower.includes("kaart"));

    return hasPokemon && !isAccessory;
  });
}
