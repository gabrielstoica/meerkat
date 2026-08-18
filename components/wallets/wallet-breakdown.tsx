"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SpaceChainBalances } from "@/lib/balances";
import { formatUsd } from "@/lib/format";
import type { UsdPrices } from "@/lib/prices";
import { SUPPORTED_CHAINS } from "@/lib/thirdweb";
import { getTokensForChain, type SupportedToken } from "@/lib/tokens";

type WalletBreakdownProps = {
  unavailableChainIds: number[];
  chainBalances: SpaceChainBalances | undefined;
  prices: UsdPrices;
  isBalancesLoading: boolean;
  canWithdraw: boolean;
  onWithdraw: () => void;
};

// True when any token on any chain has a numeric balance greater than 0.
export function hasPositiveTokenBalance(chainBalances: SpaceChainBalances | undefined): boolean {
  if (!chainBalances) {
    return false;
  }

  for (const chain of SUPPORTED_CHAINS) {
    const summary = chainBalances[chain.id];
    if (!summary || summary.unavailable) {
      continue;
    }
    for (const symbol of getTokensForChain(chain.id)) {
      if (Number(summary.tokens[symbol] ?? 0) > 0) {
        return true;
      }
    }
  }

  return false;
}

// Tokens on this chain with a numeric balance greater than 0.
export function fundedTokensForChain(
  chainBalances: SpaceChainBalances | undefined,
  chainId: number
): SupportedToken[] {
  const summary = chainBalances?.[chainId];
  if (!summary || summary.unavailable) {
    return [];
  }
  return getTokensForChain(chainId).filter((symbol) => Number(summary.tokens[symbol] ?? 0) > 0);
}

// Per-network token ledger for one smart wallet. Shows zero balances in this table.
export function WalletBreakdown({
  unavailableChainIds,
  chainBalances,
  prices,
  isBalancesLoading,
  canWithdraw,
  onWithdraw,
}: WalletBreakdownProps) {
  return (
    <div className="flex flex-col gap-8 pb-6 pl-11">
      {SUPPORTED_CHAINS.map((chain) => {
        const summary = chainBalances?.[chain.id];
        const isUnavailable =
          unavailableChainIds.includes(chain.id) || Boolean(summary?.unavailable);

        return (
          <section key={chain.id} className="flex flex-col gap-3">
            <h2 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {chain.name ?? `Chain ${chain.id}`}
            </h2>

            {isBalancesLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : isUnavailable ? (
              // A failed discovery or balance read marks this network unavailable.
              <p className="text-sm text-muted-foreground">Unavailable</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {getTokensForChain(chain.id).map((symbol) => {
                  const balance = summary?.tokens[symbol] ?? "0";
                  const usd = Number(balance) * (prices[symbol] ?? 0);
                  return (
                    <li
                      key={symbol}
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-6 text-sm"
                    >
                      <span>{symbol}</span>
                      <span className="font-mono tabular-nums text-muted-foreground">{balance}</span>
                      <span className="min-w-20 text-right tabular-nums">{formatUsd(usd)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      <div className="flex justify-end">
        <Button onClick={onWithdraw} disabled={!canWithdraw}>
          Withdraw
        </Button>
      </div>
    </div>
  );
}
