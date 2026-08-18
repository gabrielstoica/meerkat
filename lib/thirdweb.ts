import { createThirdwebClient, defineChain, type Chain } from "thirdweb";
import { base, ethereum } from "thirdweb/chains";
import { createWallet } from "thirdweb/wallets";
import { RPC_TIMEOUT_MS } from "@/lib/constants";
import { withTimeout } from "@/lib/timeout";

export type { Chain };

// Thirdweb client, wallets, and production chain definitions.

export const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
if (!clientId) {
  throw new Error("Thirdweb SDK: no client ID provided!");
}

export const client = createThirdwebClient({
  clientId,
  config: {
    rpc: {
      // Cap a single provider attempt. withRpcFallback advances to the next URL after this.
      fetch: { requestTimeoutMs: RPC_TIMEOUT_MS },
    },
  },
});

export const DEFAULT_WALLETS = [
  createWallet("walletConnect"),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
];

export const DEFAULT_APP_METADATA = {
  name: "Meerkat",
  url: "http://localhost:3000",
  description: "View and withdraw from smart wallets you own",
  logoUrl: "",
};

// Ordered RPC providers per chain. The first URL is the default. withRpcFallback tries the next
// URL when the current one fails or times out.
export const CHAIN_RPC_URLS: Record<number, readonly string[]> = {
  [ethereum.id]: ["https://ethereum-rpc.publicnode.com", "https://cloudflare-eth.com", "https://rpc.ankr.com/eth"],
  [base.id]: ["https://mainnet.base.org", "https://base-rpc.publicnode.com", "https://rpc.ankr.com/base"],
  999: ["https://rpc.hyperliquid.xyz/evm", "https://hyperliquid-json-rpc.bwarelabs.com", "https://hyperliquid.drpc.org"],
};

// Returns the ordered RPC list for a chain. Falls back to the Ethereum list for unknown IDs.
export function getChainRpcUrls(chainId: number): readonly string[] {
  return CHAIN_RPC_URLS[chainId] ?? CHAIN_RPC_URLS[ethereum.id]!;
}

function primaryRpc(chainId: number): string {
  return getChainRpcUrls(chainId)[0]!;
}

// Ethereum mainnet. Default RPC is the first provider in CHAIN_RPC_URLS.
export const ethereumCustom = defineChain({
  ...ethereum,
  rpc: primaryRpc(ethereum.id),
  icon: { url: "/assets/symbols/eth-chain.svg", width: 20, height: 20, format: "svg" },
});

// Base mainnet. Default RPC is the first provider in CHAIN_RPC_URLS.
export const baseCustom = defineChain({
  ...base,
  rpc: primaryRpc(base.id),
  icon: { url: "/assets/symbols/base.svg", width: 20, height: 20, format: "svg" },
  blockExplorers: [
    {
      name: "Basescan",
      url: "https://basescan.org",
    },
  ],
});

// HyperEVM mainnet. Default RPC is the first provider in CHAIN_RPC_URLS.
export const hyperEVMCustom = defineChain({
  id: 999,
  name: "HyperEVM",
  nativeCurrency: {
    name: "Hype",
    symbol: "HYPE",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "HyperEVMScan",
      url: "https://hyperevmscan.io",
    },
  ],
  rpc: primaryRpc(999),
  icon: { url: "/assets/symbols/hype.svg", width: 20, height: 20, format: "svg" },
});

// Production chains only. No testnets.
export const SUPPORTED_CHAINS = [ethereumCustom, baseCustom, hyperEVMCustom];

// Default chain when the caller does not name a chain.
export const DEFAULT_CHAIN = SUPPORTED_CHAINS[0];

// Returns the chain config for Ethereum, Base, or HyperEVM (primary RPC).
export const getChain = (chainId: number | string): Chain => {
  chainId = typeof chainId === "string" ? Number(chainId) : chainId;

  switch (chainId) {
    case ethereum.id:
      return ethereumCustom;
    case base.id:
      return baseCustom;
    case hyperEVMCustom.id:
      return hyperEVMCustom;
    default:
      // Unknown chain IDs map to Ethereum.
      return DEFAULT_CHAIN;
  }
};

// Returns a chain copy that points at a specific RPC URL. Does not call defineChain, so the
// thirdweb chain cache keeps the primary RPC for the default chain object.
export function getChainWithRpc(chainId: number, rpcUrl: string): Chain {
  return { ...getChain(chainId), rpc: rpcUrl };
}

// Runs an RPC-backed action against each provider in order until one succeeds.
// Each provider has RPC_TIMEOUT_MS. Throws when every provider fails or times out.
export async function withRpcFallback<T>(chainId: number, run: (chain: Chain) => Promise<T>): Promise<T> {
  const urls = getChainRpcUrls(chainId);
  let lastError: unknown = new Error(`No RPC providers configured for chain ${chainId}`);

  for (const rpcUrl of urls) {
    const chain = getChainWithRpc(chainId, rpcUrl);
    try {
      return await withTimeout(run(chain), RPC_TIMEOUT_MS, `RPC ${rpcUrl} on chain ${chainId}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`All RPC providers failed for chain ${chainId}`);
}
