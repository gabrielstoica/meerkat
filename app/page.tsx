"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConnectEmbed, lightTheme, useActiveAccount } from "thirdweb/react";
import { BrandMark } from "@/components/brand-mark";
import { client, DEFAULT_APP_METADATA, DEFAULT_CHAIN, DEFAULT_WALLETS, SUPPORTED_CHAINS } from "@/lib/thirdweb";

const connectTheme = lightTheme({
  colors: {
    modalBg: "#f7f8fa",
    borderColor: "#c9d1db",
    separatorLine: "#d7dde4",
    primaryText: "#101820",
    secondaryText: "#5b6673",
    accentText: "#b86a2b",
    accentButtonBg: "#b86a2b",
    accentButtonText: "#fffaf4",
    primaryButtonBg: "#101820",
    primaryButtonText: "#f7f8fa",
    connectedButtonBg: "#101820",
    connectedButtonBgHover: "#2f3a46",
    secondaryButtonBg: "#e2e7ed",
    secondaryButtonText: "#101820",
    secondaryButtonHoverBg: "#d7dde4",
    tertiaryBg: "#eef1f4",
    skeletonBg: "#e2e7ed",
  },
});

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
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[55vh] bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--copper)_18%,transparent),transparent_70%)]"
      />

      <div className="relative flex w-full max-w-md flex-col items-center gap-10 text-center">
        <div className="animate-meerkat-rise flex flex-col items-center gap-5">
          <BrandMark size="lg" />
          <p className="max-w-sm text-base leading-relaxed text-muted-foreground md:text-lg">
            One lookout for every smart wallet you own across chains.
          </p>
        </div>

        <div className="animate-meerkat-rise-delay w-fit max-w-full">
          <ConnectEmbed
            client={client}
            wallets={DEFAULT_WALLETS}
            chain={DEFAULT_CHAIN}
            chains={SUPPORTED_CHAINS}
            appMetadata={DEFAULT_APP_METADATA}
            theme={connectTheme}
          />
        </div>
      </div>
    </main>
  );
}
