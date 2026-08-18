"use client";

import { ThemeProvider } from "next-themes";
import { ThirdwebProvider } from "thirdweb/react";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <ThirdwebProvider>
        {children}
        <Toaster />
      </ThirdwebProvider>
    </ThemeProvider>
  );
}
