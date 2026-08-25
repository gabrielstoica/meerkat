"use client";

import { useCallback, useState } from "react";
import { ChevronRightIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletBreakdown, hasPositiveTokenBalance } from "@/components/wallets/wallet-breakdown";
import { WithdrawDialog } from "@/components/wallets/withdraw-dialog";
import type { SpaceChainBalances } from "@/lib/balances";
import type { DiscoveredAccount } from "@/lib/factories";
import { formatUsd, shortenAddress } from "@/lib/format";
import type { UsdPrices } from "@/lib/prices";
import { getChain } from "@/lib/thirdweb";
import { cn } from "@/lib/utils";

type WalletRowProps = {
  account: DiscoveredAccount;
  unavailableChainIds: number[];
  chainBalances: SpaceChainBalances | undefined;
  totalUsd: number;
  prices: UsdPrices;
  isBalancesLoading: boolean;
  onRefetchBalances: (addresses: string[]) => Promise<void>;
};

// Builds the default-chain explorer URL for a smart-wallet address.
function explorerAddressUrl(address: string): string | undefined {
  const base = getChain(1).blockExplorers?.[0]?.url;
  if (!base) {
    return undefined;
  }
  return `${base.replace(/\/$/, "")}/address/${address}`;
}

// One discovered smart wallet: summary row, token breakdown, and withdraw dialog.
export function WalletRow({
  account,
  unavailableChainIds,
  chainBalances,
  totalUsd,
  prices,
  isBalancesLoading,
  onRefetchBalances,
}: WalletRowProps) {
  const [open, setOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const explorerUrl = explorerAddressUrl(account.address);
  const canWithdraw = account.usesSpaceWithdraw && hasPositiveTokenBalance(chainBalances);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(account.address);
      toast("Address copied.");
    } catch {
      toast.error("Copy failed.");
    }
  }, [account.address]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/80 bg-card/70 shadow-[0_18px_50px_-36px_rgba(16,24,32,0.55)] backdrop-blur-sm transition-[border-color,box-shadow]",
        open && "border-copper/35 shadow-[0_22px_60px_-34px_rgba(184,106,43,0.35)]"
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          nativeButton={false}
          render={
            <div
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-mist/30 md:px-5"
            />
          }
          aria-label={open ? "Collapse wallet" : "Expand wallet"}
        >
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground">
            <ChevronRightIcon
              className={cn("size-4 transition-transform duration-200", open && "rotate-90")}
            />
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate font-mono text-sm tracking-tight">{shortenAddress(account.address)}</p>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(event) => {
                  event.stopPropagation();
                  void onCopy();
                }}
                aria-label="Copy address"
              >
                <CopyIcon />
              </Button>
              {explorerUrl ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  nativeButton={false}
                  render={<a href={explorerUrl} target="_blank" rel="noreferrer" />}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  aria-label="Open in block explorer"
                >
                  <ExternalLinkIcon />
                </Button>
              ) : null}
            </div>
            <Badge
              variant="secondary"
              className="w-fit border border-border/70 bg-background/60 font-normal text-muted-foreground"
            >
              {account.factoryLabel}
            </Badge>
          </div>

          {isBalancesLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <p className="font-display text-lg font-semibold tabular-nums tracking-tight text-ink">
              {formatUsd(totalUsd)}
            </p>
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border/70 bg-background/40 px-4 py-5 md:px-5">
            <WalletBreakdown
              unavailableChainIds={unavailableChainIds}
              chainBalances={chainBalances}
              prices={prices}
              isBalancesLoading={isBalancesLoading}
              canWithdraw={canWithdraw}
              onWithdraw={() => setWithdrawOpen(true)}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        spaceAddress={account.address}
        chainBalances={chainBalances}
        onSuccess={() => {
          void onRefetchBalances([account.address]);
        }}
      />
    </div>
  );
}
