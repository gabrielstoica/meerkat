import { getWalletBalance } from "thirdweb/wallets";
import { client, SUPPORTED_CHAINS } from "@/lib/thirdweb";
import {
  getNativeTokenSymbol,
  getTokenAddress,
  getTokensForChain,
  isNativeTokenAddress,
  type SupportedToken,
} from "@/lib/tokens";

export type ChainBalanceSummary = {
  name: string;
  nativeCurrency: string;
  tokens: Partial<Record<SupportedToken, string>>;
  unavailable?: boolean;
};

export type SpaceChainBalances = Record<number, ChainBalanceSummary>;

// Fetches native and ERC-20 balances for one address on every supported chain.
// A failed token read returns "0". A failed chain returns an empty token map with unavailable set.
export async function fetchBalancesForAddress(address: string): Promise<SpaceChainBalances> {
  const entries = await Promise.all(
    SUPPORTED_CHAINS.map(async (chain) => {
      try {
        // Read every registry token on this chain. Isolate each token failure so one bad read
        // cannot blank the chain. Omit tokenAddress for the native asset.
        const tokenEntries = await Promise.all(
          getTokensForChain(chain.id).map(async (symbol) => {
            const tokenAddress = getTokenAddress(symbol, chain.id);
            const isNative =
              symbol === getNativeTokenSymbol(chain.id) || isNativeTokenAddress(tokenAddress);
            try {
              const balance = await getWalletBalance({
                address,
                client,
                chain,
                ...(isNative ? {} : { tokenAddress }),
              });
              return [symbol, balance?.displayValue ?? "0"] as const;
            } catch {
              return [symbol, "0"] as const;
            }
          })
        );

        const tokens = tokenEntries.reduce<Partial<Record<SupportedToken, string>>>(
          (acc, [symbol, value]) => {
            acc[symbol] = value;
            return acc;
          },
          {}
        );

        const summary: ChainBalanceSummary = {
          name: chain.name ?? `Chain ${chain.id}`,
          nativeCurrency: chain.nativeCurrency?.name ?? "Ether",
          tokens,
        };

        return [chain.id, summary] as const;
      } catch {
        const summary: ChainBalanceSummary = {
          name: chain.name ?? `Chain ${chain.id}`,
          nativeCurrency: chain.nativeCurrency?.name ?? "Ether",
          tokens: {},
          unavailable: true,
        };
        return [chain.id, summary] as const;
      }
    })
  );

  return Object.fromEntries(entries) as SpaceChainBalances;
}
