// Shared protocol addresses and cache timings.

// Public source repository for this app.
export const GITHUB_REPO_URL = "https://github.com/gabrielstoica/meerkat";

// StationRegistry factory address on every supported chain.
export const STATION_REGISTRY_ADDRESS = "0xf169648a758b767AD6775E2f7eD8337a0aE4685d" as const;

// Cache lifetime for CoinGecko USD prices (ms).
export const PRICE_CACHE_MS = 60_000;

// Max wait for one RPC provider attempt. withRpcFallback moves to the next URL after this.
export const RPC_TIMEOUT_MS = 10_000;
