"use client";

import { WalletIcon } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletRow } from "@/components/wallets/wallet-row";
import type { SpaceChainBalances } from "@/lib/balances";
import type { DiscoveredAccount } from "@/lib/factories";
import { useUsdPrices } from "@/lib/hooks/useUsdPrices";

type WalletListProps = {
  accounts: DiscoveredAccount[];
  unavailableChainIds: number[];
  balances: Record<string, SpaceChainBalances>;
  fiatBySpaceAddress: Record<string, number>;
  isDiscoveryLoading: boolean;
  isBalancesLoading: boolean;
  onRefetchBalances: (addresses: string[]) => Promise<void>;
};

// Smart-wallet list with loading skeletons and an empty state.
export function WalletList({
  accounts,
  unavailableChainIds,
  balances,
  fiatBySpaceAddress,
  isDiscoveryLoading,
  isBalancesLoading,
  onRefetchBalances,
}: WalletListProps) {
  const { prices } = useUsdPrices();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-16">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Smart wallets</h1>
        {isDiscoveryLoading ? (
          <Skeleton className="h-5 w-8" />
        ) : (
          <p className="text-sm tabular-nums text-muted-foreground">{accounts.length}</p>
        )}
      </div>

      <div className="mt-10">
        {isDiscoveryLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : accounts.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <WalletIcon />
              </EmptyMedia>
              <EmptyTitle>No smart wallets found for this address.</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ul className="flex flex-col">
              {accounts.map((account) => (
                <li key={account.address}>
                  <WalletRow
                    account={account}
                    unavailableChainIds={unavailableChainIds}
                    chainBalances={balances[account.address]}
                    totalUsd={fiatBySpaceAddress[account.address] ?? 0}
                    prices={prices}
                    isBalancesLoading={isBalancesLoading && !balances[account.address]}
                    onRefetchBalances={onRefetchBalances}
                  />
                </li>
              ))}
            </ul>
            <Separator />
          </>
        )}
      </div>
    </main>
  );
}
