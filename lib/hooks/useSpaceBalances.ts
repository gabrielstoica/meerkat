"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchBalancesForAddress, type SpaceChainBalances } from "@/lib/balances";
import { useUsdPrices } from "@/lib/hooks/useUsdPrices";
import { SUPPORTED_CHAINS } from "@/lib/thirdweb";
import { getTokensForChain } from "@/lib/tokens";

export type UseSpaceBalancesResult = {
  balances: Record<string, SpaceChainBalances>;
  fiatBySpaceAddress: Record<string, number>;
  isLoading: boolean;
  refetch: (addresses: string[]) => Promise<void>;
};

// Loads on-chain balances for Space addresses. Does not watch deposit or withdraw events.
export function useSpaceBalances(addresses: string[]): UseSpaceBalancesResult {
  const [balances, setBalances] = useState<Record<string, SpaceChainBalances>>({});
  const [isFetching, setIsFetching] = useState(() => addresses.length > 0);
  const { prices, isLoading: isLoadingPrices } = useUsdPrices();
  const requestIdRef = useRef(0);

  // Stabilise the dependency: only re-fetch when the sorted address list actually changes.
  const addressKey = [...addresses].sort().join(",");

  const refetch = useCallback(async (nextAddresses: string[]) => {
    const requestId = ++requestIdRef.current;

    if (!nextAddresses.length) {
      setIsFetching(false);
      return;
    }

    setIsFetching(true);

    try {
      const entries = await Promise.all(
        nextAddresses.map(async (addr) => [addr, await fetchBalancesForAddress(addr)] as const)
      );
      if (requestId !== requestIdRef.current) {
        return;
      }
      setBalances((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    } catch {
      if (requestId !== requestIdRef.current) {
        return;
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsFetching(false);
      }
    }
  }, []);

  useEffect(() => {
    const nextAddresses = addressKey ? addressKey.split(",") : [];
    void refetch(nextAddresses);
  }, [addressKey, refetch]);

  const fiatBySpaceAddress: Record<string, number> = {};
  for (const addr of addresses) {
    const chainBalances = balances[addr] ?? {};
    let total = 0;
    for (const chain of SUPPORTED_CHAINS) {
      const summary = chainBalances[chain.id];
      if (!summary) {
        continue;
      }
      for (const symbol of getTokensForChain(chain.id)) {
        const balance = Number(summary.tokens[symbol] ?? 0) || 0;
        total += balance * (prices[symbol] ?? 0);
      }
    }
    fiatBySpaceAddress[addr] = total;
  }

  return {
    balances,
    fiatBySpaceAddress,
    isLoading: isFetching || isLoadingPrices,
    refetch,
  };
}
