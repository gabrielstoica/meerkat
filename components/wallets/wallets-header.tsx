"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useActiveWallet, useDisconnect } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { shortenAddress } from "@/lib/format";

type WalletsHeaderProps = {
  eoa: string | undefined;
};

// Top bar: product name on the left, connected EOA and disconnect on the right.
export function WalletsHeader({ eoa }: WalletsHeaderProps) {
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  const onDisconnect = useCallback(() => {
    if (wallet) {
      disconnect(wallet);
    }
    router.replace("/");
  }, [disconnect, router, wallet]);

  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <p className="text-lg font-semibold tracking-tight">Meerkat</p>
        <div className="flex items-center gap-3">
          {eoa ? (
            <p className="font-mono text-sm text-muted-foreground">{shortenAddress(eoa)}</p>
          ) : null}
          <Button variant="outline" onClick={onDisconnect} disabled={!wallet}>
            Disconnect
          </Button>
        </div>
      </div>
    </header>
  );
}
