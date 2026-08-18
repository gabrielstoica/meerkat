"use client";

import { useCallback, useState } from "react";
import { ChevronRightIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
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
    <div>
      <Separator />
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-3 py-5">
          <CollapsibleTrigger
            render={<Button variant="ghost" size="icon-sm" />}
            aria-label={open ? "Collapse wallet" : "Expand wallet"}
          >
            <ChevronRightIcon className={cn("transition-transform", open && "rotate-90")} />
          </CollapsibleTrigger>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <p className="truncate font-mono text-sm">{shortenAddress(account.address)}</p>
            <Button variant="ghost" size="icon-sm" onClick={onCopy} aria-label="Copy address">
              <CopyIcon />
            </Button>
            {explorerUrl ? (
              <Button
                variant="ghost"
                size="icon-sm"
                nativeButton={false}
                render={<a href={explorerUrl} target="_blank" rel="noreferrer" />}
                aria-label="Open in block explorer"
              >
                <ExternalLinkIcon />
              </Button>
            ) : null}
            <Badge variant="secondary">{account.factoryLabel}</Badge>
          </div>

          {isBalancesLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            <p className="text-sm tabular-nums">{formatUsd(totalUsd)}</p>
          )}
        </div>

        <CollapsibleContent>
          <WalletBreakdown
            unavailableChainIds={unavailableChainIds}
            chainBalances={chainBalances}
            prices={prices}
            isBalancesLoading={isBalancesLoading}
            canWithdraw={canWithdraw}
            onWithdraw={() => setWithdrawOpen(true)}
          />
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
