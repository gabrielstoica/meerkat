"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useActiveAccount, useActiveWalletConnectionStatus, useIsAutoConnecting } from "thirdweb/react";
import { WalletList } from "@/components/wallets/wallet-list";
import { WalletsHeader } from "@/components/wallets/wallets-header";
import { useAccountDiscovery } from "@/lib/hooks/useAccountDiscovery";
import { useSpaceBalances } from "@/lib/hooks/useSpaceBalances";

// Wallet list page. Redirects to / when no EOA is connected.
export default function WalletsPage() {
  const account = useActiveAccount();
  const connectionStatus = useActiveWalletConnectionStatus();
  const isAutoConnecting = useIsAutoConnecting();
  const router = useRouter();

  const eoa = account?.address as `0x${string}` | undefined;
  const discovery = useAccountDiscovery(eoa);
  const addresses = useMemo(() => discovery.accounts.map((item) => item.address), [discovery.accounts]);
  const spaceBalances = useSpaceBalances(addresses);

  // Wait only while AutoConnect is active or a wallet is mid-connect.
  // Do not treat "unknown" alone as pending — without AutoConnect that never clears.
  const isSessionPending = isAutoConnecting || connectionStatus === "connecting";

  useEffect(() => {
    if (isSessionPending) {
      return;
    }
    if (!account) {
      router.replace("/");
    }
  }, [account, isSessionPending, router]);

  if (!account) {
    return (
      <div className="flex min-h-screen flex-col">
        <WalletsHeader eoa={eoa} />
        <WalletList
          accounts={[]}
          unavailableChainIds={[]}
          balances={{}}
          fiatBySpaceAddress={{}}
          isDiscoveryLoading
          isBalancesLoading
          onRefetchBalances={spaceBalances.refetch}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <WalletsHeader eoa={account.address} />
      <WalletList
        accounts={discovery.accounts}
        unavailableChainIds={discovery.unavailableChainIds}
        balances={spaceBalances.balances}
        fiatBySpaceAddress={spaceBalances.fiatBySpaceAddress}
        isDiscoveryLoading={discovery.isLoading}
        isBalancesLoading={spaceBalances.isLoading}
        onRefetchBalances={spaceBalances.refetch}
      />
    </div>
  );
}
