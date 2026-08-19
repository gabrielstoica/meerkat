import type { NextConfig } from "next";

// Static HTML for Arweave / ar.io. Local `yarn dev` and `yarn start` stay on the Node server.
const isArweaveExport = process.env.ARWEAVE_EXPORT === "1";

// Next.js config.
// @coinbase/cdp-sdk (via Coinbase / Base Account in thirdweb) lazily imports optional
// @x402/* peers. Turbopack still resolves those imports and fails when they are absent.
const nextConfig: NextConfig = {
  ...(isArweaveExport
    ? {
        output: "export" as const,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
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
