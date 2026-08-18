import { NATIVE_TOKEN_ADDRESS } from "thirdweb";

// Token symbols supported on Ethereum, Base, and HyperEVM.
export type SupportedToken = "USDC" | "EURC" | "USDT" | "USDT0" | "TGBP" | "JPYC" | "XSGD" | "ZCHF" | "ETH" | "UETH" | "HYPE";

export type TokenRegistryEntry = {
  symbol: SupportedToken;
  decimals: number;
  // CoinGecko coin id used to fetch the market price for this token.
  coingeckoId: string;
  // Fallback USD price before the first market fetch, or when CoinGecko omits a value.
  defaultPrice: number;
  // Deployment addresses for this token, keyed by chain ID as a string.
  addresses: Partial<Record<string, string>>;
};

// Supported token addresses on Ethereum (1), Base (8453), and HyperEVM (999).
export const TOKEN_REGISTRY: TokenRegistryEntry[] = [
  {
    symbol: "USDC",
    decimals: 6,
    coingeckoId: "usd-coin",
    defaultPrice: 1,
    addresses: {
      "1": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "999": "0xb88339CB7199b77E23DB6E890353E22632Ba630f",
      "8453": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    },
  },
  {
    symbol: "EURC",
    decimals: 6,
    coingeckoId: "euro-coin",
    defaultPrice: 1,
    addresses: {
      "1": "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c",
      "8453": "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
    },
  },
  {
    symbol: "USDT",
    decimals: 6,
    coingeckoId: "tether",
    defaultPrice: 1,
    addresses: {
      "1": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      "8453": "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    },
  },
  {
    symbol: "USDT0",
    decimals: 6,
    coingeckoId: "usdt0",
    defaultPrice: 1,
    addresses: {
      "999": "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
    },
  },
  {
    symbol: "TGBP",
    decimals: 18,
    coingeckoId: "tokenised-gbp",
    defaultPrice: 1,
    addresses: {
      "1": "0x27f6c8289550fce67f6b50bed1f519966afe5287",
      "8453": "0x27f6c8289550fce67f6b50bed1f519966afe5287",
    },
  },
  {
    symbol: "JPYC",
    decimals: 18,
    coingeckoId: "jpycoin",
    defaultPrice: 1,
    addresses: {
      "1": "0xe7c3d8c9a439fede00d2600032d5db0be71c3c29",
    },
  },
  {
    symbol: "XSGD",
    decimals: 6,
    coingeckoId: "xsgd",
    defaultPrice: 1,
    addresses: {
      "1": "0x70e8de73ce538da2beed35d14187f6959a8eca96",
      "8453": "0x0a4c9cb2778ab3302996a34befcf9a8bc288c33b",
    },
  },
  {
    symbol: "ZCHF",
    decimals: 18,
    coingeckoId: "frankencoin",
    defaultPrice: 1,
    addresses: {
      "1": "0xb58e61c3098d85632df34eecfb899a1ed80921cb",
      "8453": "0xd4dd9e2f021bb459d5a5f6c24c12fe09c5d45553",
    },
  },
  {
    symbol: "ETH",
    decimals: 18,
    coingeckoId: "ethereum",
    defaultPrice: 1,
    addresses: {
      "1": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      "8453": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    },
  },
  {
    symbol: "UETH",
    decimals: 18,
    coingeckoId: "unit-ethereum",
    defaultPrice: 0,
    addresses: {
      "999": "0xBe6727B535545C67d5cAa73dEa54865B92CF7907",
    },
  },
  {
    symbol: "HYPE",
    decimals: 18,
    coingeckoId: "hyperliquid",
    defaultPrice: 0,
    addresses: {
      "999": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    },
  },
];

// Finds the registry row for a token symbol.
const getEntry = (symbol: SupportedToken) => TOKEN_REGISTRY.find((entry) => entry.symbol === symbol);

// Resolves the on-chain contract address for a token symbol on a given chain.
// Returns an empty string if the token has no deployment on that chain.
export const getTokenAddress = (symbol: SupportedToken, chainId: number): string => {
  const address = getEntry(symbol)?.addresses[String(chainId)];
  return address || "";
};

// Returns the decimals for a token symbol. Unknown symbols return 18.
export const getTokenDecimals = (symbol: SupportedToken): number => {
  const entry = getEntry(symbol);
  if (!entry) {
    return 18;
  }
  return entry.decimals;
};

// Resolves a token symbol from a contract address on a given chain.
// Unknown addresses return ETH.
export const getTokenSymbolByAddress = (address: string, chainId: number): SupportedToken => {
  const normalizedAddress = address.toLowerCase();
  return (
    TOKEN_REGISTRY.find((entry) => entry.addresses[String(chainId)]?.toLowerCase() === normalizedAddress)?.symbol ||
    "ETH"
  );
};

// Returns the tokens that have a deployment on the given chain, in registry order.
export const getTokensForChain = (chainId: number): SupportedToken[] => {
  return TOKEN_REGISTRY.filter((entry) => Boolean(entry.addresses[String(chainId)])).map((entry) => entry.symbol);
};

// Returns CoinGecko ids and default USD prices for every supported token.
export const getTokenPricing = (): { symbol: SupportedToken; coingeckoId: string; defaultPrice: number }[] =>
  TOKEN_REGISTRY.map(({ symbol, coingeckoId, defaultPrice }) => ({ symbol, coingeckoId, defaultPrice }));

// Returns decimals for a contract address. Token decimals are the same on every chain.
// Unknown addresses return 18.
export const getTokenDecimalsByAddress = (address: string): number => {
  const normalizedAddress = address.toLowerCase();
  const entry = TOKEN_REGISTRY.find((registryEntry) =>
    Object.values(registryEntry.addresses).some((tokenAddress) => tokenAddress?.toLowerCase() === normalizedAddress)
  );
  if (!entry) {
    return 18;
  }
  return entry.decimals;
};

// True when the address is the ERC-7528 native token sentinel.
export function isNativeTokenAddress(address: string): boolean {
  return address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();
}

// Native symbol for a supported chain.
export function getNativeTokenSymbol(chainId: number): SupportedToken {
  return chainId === 999 ? "HYPE" : "ETH";
}
