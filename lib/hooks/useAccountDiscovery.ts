"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { discoverAccounts, type DiscoveredAccount } from "@/lib/factories";

export type UseAccountDiscoveryResult = {
  accounts: DiscoveredAccount[];
  unavailableChainIds: number[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

// Loads smart accounts for a connected EOA. Skips the fetch when the EOA is unset.
export function useAccountDiscovery(eoa: `0x${string}` | undefined): UseAccountDiscoveryResult {
  const [accounts, setAccounts] = useState<DiscoveredAccount[]>([]);
  const [unavailableChainIds, setUnavailableChainIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(eoa));
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!eoa) {
      setAccounts([]);
      setUnavailableChainIds([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await discoverAccounts(eoa);
      // Ignore a stale response after the EOA changes or a later refetch starts.
      if (requestId !== requestIdRef.current) {
        return;
      }
      setAccounts(result.accounts);
      setUnavailableChainIds(result.unavailableChainIds);
    } catch (caught) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setAccounts([]);
      setUnavailableChainIds([]);
      setError(caught instanceof Error ? caught : new Error("Account discovery failed"));
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [eoa]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { accounts, unavailableChainIds, isLoading, error, refetch };
}
