"use client";

import { useEffect, useState } from "react";
import { fetchUsdPrices, type UsdPrices } from "@/lib/prices";
import { getTokenPricing, type SupportedToken } from "@/lib/tokens";

const DEFAULT_PRICES: Record<SupportedToken, number> = getTokenPricing().reduce(
  (acc, { symbol, defaultPrice }) => {
    acc[symbol] = defaultPrice;
    return acc;
  },
  {} as Record<SupportedToken, number>
);

export type UseUsdPricesResult = {
  prices: UsdPrices;
  isLoading: boolean;
};

// Loads USD prices on mount. Reuses a cached CoinGecko result for PRICE_CACHE_MS.
export function useUsdPrices(): UseUsdPricesResult {
  const [prices, setPrices] = useState<UsdPrices>(DEFAULT_PRICES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const next = await fetchUsdPrices();
      if (cancelled) {
        return;
      }
      setPrices(next);
      setIsLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { prices, isLoading };
}
