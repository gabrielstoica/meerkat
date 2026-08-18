"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChainIcon, TokenIcon } from "@/components/token-icon";
import type { SpaceChainBalances } from "@/lib/balances";
import { formatUsd } from "@/lib/format";
import type { UsdPrices } from "@/lib/prices";
import { SUPPORTED_CHAINS } from "@/lib/thirdweb";
import { getTokensForChain, type SupportedToken } from "@/lib/tokens";
import { cn } from "@/lib/utils";

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
export function fundedTokensForChain(chainBalances: SpaceChainBalances | undefined, chainId: number): SupportedToken[] {
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
    <div className="flex flex-col gap-6">
      {SUPPORTED_CHAINS.map((chain) => {
        const summary = chainBalances?.[chain.id];
        const isUnavailable = unavailableChainIds.includes(chain.id) || Boolean(summary?.unavailable);

        return (
          <section key={chain.id} className="flex flex-col gap-2.5">
            <h2 className="flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              <ChainIcon chainId={chain.id} size={14} />
              <span>{chain.name ?? `Chain ${chain.id}`}</span>
            </h2>

            {isBalancesLoading ? (
              <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-card/50 p-3">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-5/6 rounded-lg" />
              </div>
            ) : isUnavailable ? (
              // A failed discovery or balance read marks this network unavailable.
              <p className="rounded-xl border border-dashed border-border/70 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
                Unavailable
              </p>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                {getTokensForChain(chain.id).map((symbol, index, tokens) => {
                  const balance = summary?.tokens[symbol] ?? "0";
                  const usd = Number(balance) * (prices[symbol] ?? 0);
                  const isZero = Number(balance) === 0;
                  return (
                    <li
                      key={symbol}
                      className={cn(
                        "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-3.5 py-2.5 transition-colors hover:bg-mist/35 md:gap-6",
                        index < tokens.length - 1 && "border-b border-border/50",
                        isZero && "opacity-55"
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <TokenIcon
                          symbol={symbol}
                          size={22}
                          className={cn("rounded-full", isZero && "grayscale")}
                        />
                        <span className={cn("truncate text-sm", isZero ? "text-muted-foreground" : "font-medium text-ink")}>
                          {symbol}
                        </span>
                      </div>
                      <span className="font-mono text-sm tabular-nums text-muted-foreground">{balance}</span>
                      <span className="min-w-16 text-right text-sm tabular-nums text-ink/90 md:min-w-20">
                        {formatUsd(usd)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      <div className="flex justify-end border-t border-border/60 pt-5">
        <Button className="bg-copper text-copper-foreground hover:bg-copper/90" onClick={onWithdraw} disabled={!canWithdraw}>
          Withdraw
        </Button>
      </div>
    </div>
  );
}
