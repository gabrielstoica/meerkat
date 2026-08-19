import type { NextConfig } from "next";

// Next.js config.
// @coinbase/cdp-sdk (via Coinbase / Base Account in thirdweb) lazily imports optional
// @x402/* peers. Turbopack still resolves those imports and fails when they are absent.
const nextConfig: NextConfig = {
  serverExternalPackages: ["@coinbase/cdp-sdk", "@base-org/account"],
  turbopack: {
    resolveAlias: {
      "@x402/core/client": "./lib/stubs/empty-module.js",
      "@x402/core": "./lib/stubs/empty-module.js",
      "@x402/svm/exact/client": "./lib/stubs/empty-module.js",
      "@x402/svm": "./lib/stubs/empty-module.js",
      "@x402/evm/exact/client": "./lib/stubs/empty-module.js",
      "@x402/evm": "./lib/stubs/empty-module.js",
      "@x402/extensions": "./lib/stubs/empty-module.js",
    },
  },
};

export default nextConfig;
