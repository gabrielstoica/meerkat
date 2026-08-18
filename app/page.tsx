"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConnectEmbed, useActiveAccount } from "thirdweb/react";
import { client, DEFAULT_APP_METADATA, DEFAULT_CHAIN, DEFAULT_WALLETS, SUPPORTED_CHAINS } from "@/lib/thirdweb";

// Connect page. Sends a connected EOA to /wallets.
export default function Home() {
  const account = useActiveAccount();
  const router = useRouter();

  useEffect(() => {
    if (account) {
      router.replace("/wallets");
    }
  }, [account, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="flex w-full max-w-md flex-col items-center gap-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Meerkat</h1>
          <p className="max-w-sm text-base leading-relaxed text-zinc-500">
            View and manage your ERC-4337 smart wallets from one single interface
          </p>
        </div>
        <ConnectEmbed
          client={client}
          wallets={DEFAULT_WALLETS}
          chain={DEFAULT_CHAIN}
          chains={SUPPORTED_CHAINS}
          appMetadata={DEFAULT_APP_METADATA}
          theme="light"
        />
      </div>
    </main>
  );
}
