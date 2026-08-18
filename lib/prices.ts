import { PRICE_CACHE_MS } from "@/lib/constants";
import { getTokenPricing, type SupportedToken } from "@/lib/tokens";

export type UsdPrices = Record<SupportedToken, number>;

type PriceSnapshot = {
  prices: UsdPrices;
  fetchedAt: number;
};

let snapshot: PriceSnapshot | null = null;
let pending: Promise<UsdPrices> | null = null;

const defaultUsdPrices = (): UsdPrices =>
  getTokenPricing().reduce((acc, { symbol, defaultPrice }) => {
    acc[symbol] = defaultPrice;
    return acc;
  }, {} as UsdPrices);

const isFresh = (entry: PriceSnapshot) => Date.now() - entry.fetchedAt <= PRICE_CACHE_MS;

// Fetch USD prices from CoinGecko. Use each token defaultPrice on failure.
export async function fetchUsdPrices(): Promise<UsdPrices> {
  if (snapshot && isFresh(snapshot)) {
    return snapshot.prices;
  }

  if (pending) {
    return pending;
  }

  pending = loadUsdPrices().finally(() => {
    pending = null;
  });

  return pending;
}

async function loadUsdPrices(): Promise<UsdPrices> {
  const defaults = defaultUsdPrices();
  const pricing = getTokenPricing();
  const ids = Array.from(new Set(pricing.map((token) => token.coingeckoId))).join(",");

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      }
    );

    if (!response.ok) {
      return defaults;
    }

    const data = (await response.json()) as Record<string, { usd?: number } | undefined>;
    const prices = pricing.reduce<UsdPrices>((acc, { symbol, coingeckoId, defaultPrice }) => {
      acc[symbol] = data[coingeckoId]?.usd ?? defaultPrice;
      return acc;
    }, {} as UsdPrices);

    snapshot = { prices, fetchedAt: Date.now() };
    return prices;
  } catch {
    return defaults;
  }
}
