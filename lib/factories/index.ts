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

// Discovers accounts across adapters and chains. Dedupes by lowercase address.
// Keeps the first adapter in FACTORY_ADAPTERS order when two adapters return the same address.
// One chain or adapter failure must not clear results from other calls.
export async function discoverAccounts(
  eoa: `0x${string}`
): Promise<{ accounts: DiscoveredAccount[]; unavailableChainIds: number[] }> {
  const byAddress = new Map<string, DiscoveredAccount>();
  const unavailableChainIds = new Set<number>();

  for (const chain of SUPPORTED_CHAINS) {
    for (const adapter of FACTORY_ADAPTERS) {
      try {
        const accounts = await adapter.listAccounts(eoa, chain.id);
        for (const address of accounts) {
          const key = address.toLowerCase();
          // First adapter in FACTORY_ADAPTERS order keeps the address.
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
      } catch {
        // A failed chain or adapter must not clear results from other calls.
        unavailableChainIds.add(chain.id);
      }
    }
  }

  return {
    accounts: [...byAddress.values()],
    unavailableChainIds: [...unavailableChainIds],
  };
}
