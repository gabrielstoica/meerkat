import { SUPPORTED_CHAINS } from "@/lib/thirdweb";
import { stationRegistryAdapter } from "./stationRegistry";
import type { FactoryAdapter } from "./types";

export type { FactoryAdapter } from "./types";

// v1 registry. StationRegistry is the only adapter.
export const FACTORY_ADAPTERS: FactoryAdapter[] = [stationRegistryAdapter];

export type DiscoveredAccount = {
  address: `0x${string}`;
  factoryId: string;
  factoryLabel: string;
  usesSpaceWithdraw: boolean;
};

type ChainAdapterResult = {
  chainId: number;
  adapter: FactoryAdapter;
  accounts: `0x${string}`[];
  ok: boolean;
};

// Discovers accounts across adapters and chains. Dedupes by lowercase address.
// Keeps the first adapter in FACTORY_ADAPTERS order when two adapters return the same address.
// One chain or adapter failure must not clear results from other calls.
// Chain reads run in parallel. Each adapter call tries RPC providers in order (see withRpcFallback).
export async function discoverAccounts(
  eoa: `0x${string}`
): Promise<{ accounts: DiscoveredAccount[]; unavailableChainIds: number[] }> {
  const byAddress = new Map<string, DiscoveredAccount>();
  const unavailableChainIds = new Set<number>();

  const jobs = SUPPORTED_CHAINS.flatMap((chain) =>
    FACTORY_ADAPTERS.map(async (adapter): Promise<ChainAdapterResult> => {
      try {
        const accounts = await adapter.listAccounts(eoa, chain.id);
        return { chainId: chain.id, adapter, accounts, ok: true };
      } catch {
        // A failed chain or adapter must not clear results from other calls.
        return { chainId: chain.id, adapter, accounts: [], ok: false };
      }
    })
  );

  const results = await Promise.all(jobs);

  // Apply results in FACTORY_ADAPTERS order so the first adapter wins on address conflicts.
  for (const chain of SUPPORTED_CHAINS) {
    for (const adapter of FACTORY_ADAPTERS) {
      const result = results.find(
        (entry) => entry.chainId === chain.id && entry.adapter.id === adapter.id
      );
      if (!result) {
        continue;
      }
      if (!result.ok) {
        unavailableChainIds.add(chain.id);
        continue;
      }
      for (const address of result.accounts) {
        const key = address.toLowerCase();
        if (byAddress.has(key)) {
          continue;
        }
        byAddress.set(key, {
          address,
          factoryId: adapter.id,
          factoryLabel: adapter.label,
          usesSpaceWithdraw: adapter.usesSpaceWithdraw,
        });
      }
    }
  }

  return {
    accounts: [...byAddress.values()],
    unavailableChainIds: [...unavailableChainIds],
  };
}
