"use client";

import { ThemeProvider } from "next-themes";
import { AutoConnect, ThirdwebProvider } from "thirdweb/react";
import { Toaster } from "@/components/ui/sonner";
import { client, DEFAULT_APP_METADATA, DEFAULT_CHAIN, DEFAULT_WALLETS } from "@/lib/thirdweb";

// Theme, thirdweb, and toast providers for the app.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <ThirdwebProvider>
        <AutoConnect client={client} wallets={DEFAULT_WALLETS} chain={DEFAULT_CHAIN} appMetadata={DEFAULT_APP_METADATA} timeout={10_000} />
        {children}
        <Toaster />
      </ThirdwebProvider>
    </ThemeProvider>
  );
}
