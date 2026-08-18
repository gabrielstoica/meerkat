"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useActiveWallet, useDisconnect } from "thirdweb/react";
import { BrandMark } from "@/components/brand-mark";
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
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <BrandMark />
        <div className="flex items-center gap-3">
          {eoa ? (
            <p className="hidden rounded-full border border-border/80 bg-card/70 px-3 py-1 font-mono text-xs text-muted-foreground sm:block">
              {shortenAddress(eoa)}
            </p>
          ) : null}
          <Button
            variant="outline"
            className="border-border/80 bg-card/60"
            onClick={onDisconnect}
            disabled={!wallet}
          >
            Disconnect
          </Button>
        </div>
      </div>
    </header>
  );
}
