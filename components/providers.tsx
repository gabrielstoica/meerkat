"use client";

import { ThemeProvider } from "next-themes";
import { ThirdwebProvider } from "thirdweb/react";
import { Toaster } from "@/components/ui/sonner";

// Theme, thirdweb, and toast providers for the app.
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
