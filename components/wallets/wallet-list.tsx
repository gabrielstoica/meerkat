"use client";

import { WalletIcon } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
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
    <main className="animate-meerkat-fade mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-12 md:py-16">
      <div className="flex flex-col gap-2 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-[0.18em] text-copper uppercase">Portfolio</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">Your smart wallets</h1>
        </div>
        {isDiscoveryLoading ? (
          <Skeleton className="h-5 w-16" />
        ) : (
          <p className="text-sm tabular-nums text-muted-foreground">
            {accounts.length} {accounts.length === 1 ? "wallet" : "wallets"}
          </p>
        )}
      </div>

      <div className="mt-8">
        {isDiscoveryLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : accounts.length === 0 ? (
          <Empty className="rounded-2xl border border-dashed border-border/80 bg-card/50">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <WalletIcon />
              </EmptyMedia>
              <EmptyTitle>No smart wallets found for this address.</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-3">
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
        )}
      </div>
    </main>
  );
}
