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
// A failed token read returns "0". If every registry token on a chain fails to read,
// the chain summary sets unavailable. An unexpected throw also sets unavailable.
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
              return [symbol, balance?.displayValue ?? "0", true] as const;
            } catch {
              return [symbol, "0", false] as const;
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

        // Mark the chain unavailable when it has registry tokens and every read failed.
        const allReadsFailed =
          tokenEntries.length > 0 && tokenEntries.every(([, , ok]) => !ok);

        const summary: ChainBalanceSummary = {
          name: chain.name ?? `Chain ${chain.id}`,
          nativeCurrency: chain.nativeCurrency?.name ?? "Ether",
          tokens,
          ...(allReadsFailed ? { unavailable: true } : {}),
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
