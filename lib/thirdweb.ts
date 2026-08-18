import { createThirdwebClient, defineChain } from "thirdweb";
import { base, ethereum } from "thirdweb/chains";
import { createWallet, inAppWallet } from "thirdweb/wallets";

// Thirdweb client, wallets, and production chain definitions.

export const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
if (!clientId) {
  throw new Error("Thirdweb SDK: no client ID provided!");
}

const ALCHEMY_RPC = process.env.NEXT_PUBLIC_ALCHEMY_RPC;
if (!ALCHEMY_RPC) {
  throw new Error("NEXT_PUBLIC_ALCHEMY_RPC is not set");
}

export const WALLET_CONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
if (!WALLET_CONNECT_PROJECT_ID) {
  throw new Error("NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is not set");
}

export const client = createThirdwebClient({ clientId });

export const DEFAULT_WALLETS = [
  inAppWallet(),
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

// Ethereum mainnet with a dedicated Alchemy RPC.
export const ethereumCustom = defineChain({
  ...ethereum,
  rpc: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_RPC}`,
  icon: { url: "/assets/symbols/eth-chain.svg", width: 20, height: 20, format: "svg" },
});

// Base mainnet with a dedicated Alchemy RPC.
export const baseCustom = defineChain({
  ...base,
  rpc: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_RPC}`,
  icon: { url: "/assets/symbols/base.svg", width: 20, height: 20, format: "svg" },
});

// HyperEVM mainnet with a dedicated Alchemy RPC.
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
  rpc: `https://hyperliquid-mainnet.g.alchemy.com/v2/${ALCHEMY_RPC}`,
  icon: { url: "/assets/symbols/hype.svg", width: 20, height: 20, format: "svg" },
});

// Production chains only. No testnets.
export const SUPPORTED_CHAINS = [ethereumCustom, baseCustom, hyperEVMCustom];

// Default chain when the caller does not name a chain.
export const DEFAULT_CHAIN = SUPPORTED_CHAINS[0];

// Returns the chain config for Ethereum, Base, or HyperEVM.
export const getChain = (chainId: number | string) => {
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
