# Meerkat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a wallet-only Next.js app that lists Werk Space smart accounts for a connected EOA, shows USD totals and per-network token breakdowns, and withdraws via Space.execute from the EOA.

**Architecture:** ThemeProvider → ThirdwebProvider → App. Factory adapters discover Spaces (`StationRegistry` only in v1). Balances via thirdweb `getWalletBalance`. Prices via CoinGecko USD with registry `defaultPrice` fallback. Withdraw = Space self-call wrapped in `execute`, signed by the EOA (no ERC-4337 UserOp).

**Tech Stack:** Next.js 16.3.x App Router, React 19, TypeScript strict, Tailwind v4, shadcn/ui (zinc/slate), thirdweb v5 (`5.120.1`), viem, yarn, next-themes, sonner.

**Spec:** `docs/superpowers/specs/2026-08-18-station-lite-design.md`

## Global Constraints

- Product name in UI/README: **Meerkat** (not Werk). Source badge label may say `Werk Space`.
- Package manager: **yarn**. Remove `package-lock.json`. Dev server port **3000**.
- Path alias `@/*` → repo root (already in `tsconfig.json`).
- Comments: ASD-STE100 Simplified Technical English; `//` only; no `/* */` or JSDoc; ASCII quotes only.
- No GraphQL, Redux, urql, AuthProvider, SIWE, PostHog, Across, testnets, or Werk brand colors.
- No automated tests. Do not run lint / typecheck / build unless the owner asks.
- Do not copy Werk `.env*` files. Env names only in `.env.example`.
- MIT license. Reference copy source: `../frontend` (sibling repo), hand-copy only.
- Keep `useMemo` / `useCallback` / `memo` where they pay for themselves. No React Compiler.
- Withdraw disabled when adapter `usesSpaceWithdraw` is false, or when no token balance > 0.

## File Structure

```
app/
  layout.tsx                          # ThemeProvider + ThirdwebProvider + Toaster
  page.tsx                            # Connect (/)
  wallets/page.tsx                    # Wallet list
  globals.css                         # shadcn zinc/slate tokens
components/
  providers.tsx                       # Client providers wrapper
  wallets/
    wallets-header.tsx
    wallet-list.tsx
    wallet-row.tsx
    wallet-breakdown.tsx
    withdraw-dialog.tsx
  ui/                                 # shadcn primitives
lib/
  utils.ts
  constants.ts
  thirdweb.ts
  tokens.ts                           # registry + lookups (merged from generated + tokenRegistry)
  prices.ts
  balances.ts
  factories/
    types.ts
    stationRegistry.ts
    index.ts
  withdraw/
    abis.ts
    executeViaSmartWallet.ts
  hooks/
    useAccountDiscovery.ts
    useSpaceBalances.ts
    useUsdPrices.ts
    useWithdrawNative.ts
    useWithdrawERC20.ts
.env.example
LICENSE
README.md
```

---

### Task 1: Project foundation (yarn, deps, OSS files)

**Files:**

- Modify: `package.json`, `.gitignore`
- Delete: `package-lock.json`
- Create: `.env.example`, `LICENSE`, `README.md`
- Modify: `README.md` (replace create-next-app boilerplate)

**Interfaces:**

- Consumes: none
- Produces: yarn scripts on port 3000; env var names; MIT license; README describing Meerkat

- [ ] **Step 1: Switch package manager and install runtime deps**

Update `package.json`:

```json
{
  "name": "meerkat",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "eslint"
  },
  "dependencies": {
    "next": "16.3.1",
    "next-themes": "^0.4.6",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "sonner": "^2.0.3",
    "thirdweb": "5.120.1",
    "viem": "^2.23.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.475.0",
    "tailwind-merge": "^2.4.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.3.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

Run:

```bash
rm -f package-lock.json
yarn install
```

Expected: `yarn.lock` created; `node_modules` present.

- [ ] **Step 2: Add** `.env.example`**, MIT** `LICENSE`**, and Meerkat** `README.md`

`.env.example`:

```bash
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=
NEXT_PUBLIC_ALCHEMY_RPC=
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=
```

`README.md` must cover: what Meerkat does, how to run (`yarn install`, copy `.env.example`, `yarn dev`), the three env vars, and that it reads StationRegistry at `0xf169648a758b767AD6775E2f7eD8337a0aE4685d` on Ethereum / Base / HyperEVM. Title must not say Werk.

Confirm `.gitignore` already ignores `.env*`, `node_modules`, `.next` (it does).

- [ ] **Step 3: Commit**

```bash
git add package.json yarn.lock .env.example LICENSE README.md .gitignore
git rm -f package-lock.json 2>/dev/null || true
git commit -m "$(cat <<'EOF'
chore: switch to yarn and add dependency libs

EOF
)"
```

---

### Task 2: shadcn/ui init + primitives

**Files:**

- Create: `components.json`, `lib/utils.ts`, `components/ui/*`, update `app/globals.css`
- Modify: `app/layout.tsx` (fonts only if needed; providers come in Task 7)

**Interfaces:**

- Consumes: Tailwind v4 project
- Produces: `cn()`, Button, Badge, Dialog, Input, Select, Separator, Collapsible, Skeleton, Sonner toaster

- [ ] **Step 1: Init shadcn with zinc base**

Follow the shadcn skill. Prefer non-interactive flags:

```bash
npx shadcn@latest init --defaults --base-color zinc --css-variables
```

If prompts appear, choose: RSC yes, TSX yes, CSS `app/globals.css`, alias `@/components` / `@/lib/utils`, zinc, CSS variables.

- [ ] **Step 2: Add components**

```bash
npx shadcn@latest add button badge dialog input select separator collapsible skeleton sonner
```

- [ ] **Step 3: Neutral light-first globals**

Keep zinc tokens. Prefer a light professional look (spec: plenty of whitespace; no Werk purple). Do not force dark-only.

- [ ] **Step 4: Commit**

```bash
git add components.json lib/utils.ts components/ui app/globals.css package.json yarn.lock
git commit -m "$(cat <<'EOF'
chore: initialize shadcn with zinc primitives

EOF
)"
```

---

### Task 3: Constants, tokens, thirdweb client

**Files:**

- Create: `lib/constants.ts`, `lib/tokens.ts`, `lib/thirdweb.ts`

**Interfaces:**

- Consumes: env vars
- Produces:

  - `STATION_REGISTRY_ADDRESS`
  - `SupportedToken` string union; `TOKEN_REGISTRY`; `getTokenAddress` / `getTokensForChain` / `getTokenDecimals` / `getTokenPricing` / `getNativeTokenSymbol` / `isNativeTokenAddress`
  - `client`, `DEFAULT_WALLETS`, `SUPPORTED_CHAINS`, `DEFAULT_CHAIN`, `getChain`, `ethereumCustom`, `baseCustom`, `hyperEVMCustom`

- [ ] **Step 1: Create** `lib/constants.ts`

```ts
// StationRegistry factory address on every supported chain.
export const STATION_REGISTRY_ADDRESS = "0xf169648a758b767AD6775E2f7eD8337a0aE4685d" as const;

// Cache lifetime for CoinGecko USD prices (ms).
export const PRICE_CACHE_MS = 60_000;
```

- [ ] **Step 2: Create** `lib/tokens.ts`

Copy `WERK/frontend/lib/generated/tokenRegistry.ts` by hand into this file as a static registry.

Changes from the reference:

1. Replace GraphQL `SupportedToken` with:

```ts
export type SupportedToken = "USDC" | "EURC" | "USDT" | "USDT0" | "TGBP" | "JPYC" | "XSGD" | "ZCHF" | "ETH" | "UETH" | "HYPE";
```

1. Keep only address keys `"1"`, `"8453"`, `"999"`. Drop `"84532"` and `"11155111"`.
2. Port lookup functions from `WERK/frontend/lib/tokenRegistry.ts` (no logger): `getTokenAddress`, `getTokenDecimals`, `getTokensForChain`, `getTokenPricing`, `getTokenSymbolByAddress`, `getTokenDecimalsByAddress`.
3. Add:

```ts
import { NATIVE_TOKEN_ADDRESS } from "thirdweb";

// True when the address is the ERC-7528 native token sentinel.
export function isNativeTokenAddress(address: string): boolean {
  return address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();
}

// Native symbol for a supported chain.
export function getNativeTokenSymbol(chainId: number): SupportedToken {
  return chainId === 999 ? "HYPE" : "ETH";
}
```

- [ ] **Step 3: Create** `lib/thirdweb.ts`

Copy production chain + Alchemy pattern from `WERK/frontend/lib/thirdweb.ts`. Omit Sepolia, Base Sepolia, SIWE auth, Werk themes, PaymentModule helpers.

Required shape:

```ts
import { createThirdwebClient, defineChain } from "thirdweb";
import { base, ethereum } from "thirdweb/chains";
import { createWallet, inAppWallet } from "thirdweb/wallets";

export const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!;
const ALCHEMY_RPC = process.env.NEXT_PUBLIC_ALCHEMY_RPC!;
export const WALLET_CONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!;

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

// ethereumCustom / baseCustom / hyperEVMCustom with Alchemy RPCs as in the reference.
// SUPPORTED_CHAINS = [ethereumCustom, baseCustom, hyperEVMCustom] always.
// DEFAULT_CHAIN = SUPPORTED_CHAINS[0]
// getChain(chainId) switch for 1 / 8453 / 999 only.
```

Throw clear errors if any of the three env vars are missing (same as reference).

- [ ] **Step 4: Commit**

```bash
git add lib/constants.ts lib/tokens.ts lib/thirdweb.ts
git commit -m "$(cat <<'EOF'
feat: add chains, token registry, and thirdweb client

EOF
)"
```

---

### Task 4: Factory adapters

**Files:**

- Create: `lib/factories/types.ts`, `lib/factories/stationRegistry.ts`, `lib/factories/index.ts`, `lib/hooks/useAccountDiscovery.ts`

**Interfaces:**

- Consumes: `STATION_REGISTRY_ADDRESS`, `getChain`, `client`, `SUPPORTED_CHAINS`
- Produces:

  - `FactoryAdapter`, `FACTORY_ADAPTERS`
  - `DiscoveredAccount { address, factoryId, factoryLabel, usesSpaceWithdraw }`
  - `discoverAccounts(eoa)`, `useAccountDiscovery(eoa)`

- [ ] **Step 1: Types**

```ts
// lib/factories/types.ts
export type FactoryAdapter = {
  id: string;
  label: string;
  // Returns smart-account addresses owned by this EOA on this chain.
  listAccounts: (eoa: `0x${string}`, chainId: number) => Promise<`0x${string}`[]>;
  // True when withdraw must use Space.withdrawNative / withdrawERC20.
  usesSpaceWithdraw: boolean;
};
```

- [ ] **Step 2: StationRegistry adapter**

```ts
// lib/factories/stationRegistry.ts
import { getContract, readContract } from "thirdweb";
import { STATION_REGISTRY_ADDRESS } from "@/lib/constants";
import { client, getChain } from "@/lib/thirdweb";
import type { FactoryAdapter } from "./types";

const GET_ACCOUNTS_OF_SIGNER_ABI = {
  type: "function",
  name: "getAccountsOfSigner",
  inputs: [{ name: "signer", type: "address" }],
  outputs: [{ type: "address[]" }],
  stateMutability: "view",
} as const;

export const stationRegistryAdapter: FactoryAdapter = {
  id: "station-registry",
  label: "Werk Space",
  usesSpaceWithdraw: true,
  // Gets all Space accounts for this EOA on this chain.
  async listAccounts(eoa, chainId) {
    const contract = getContract({
      address: STATION_REGISTRY_ADDRESS,
      chain: getChain(chainId),
      client,
    });
    const accounts = await readContract({
      contract,
      method: GET_ACCOUNTS_OF_SIGNER_ABI,
      params: [eoa],
    });
    return accounts as `0x${string}`[];
  },
};
```

- [ ] **Step 3: Registry + discovery**

`lib/factories/index.ts`:

```ts
import { stationRegistryAdapter } from "./stationRegistry";
import type { FactoryAdapter } from "./types";

export type { FactoryAdapter } from "./types";
export const FACTORY_ADAPTERS: FactoryAdapter[] = [stationRegistryAdapter];

export type DiscoveredAccount = {
  address: `0x${string}`;
  factoryId: string;
  factoryLabel: string;
  usesSpaceWithdraw: boolean;
};

// Discovers accounts across adapters and chains. Dedupes by lowercase address.
// Keeps the first adapter in FACTORY_ADAPTERS order when two adapters return the same address.
// One chain or adapter failure must not clear results from other calls.
export async function discoverAccounts(eoa: `0x${string}`): Promise<{ accounts: DiscoveredAccount[]; unavailableChainIds: number[] }>;
```

Implementation notes:

- Nested loops: each `SUPPORTED_CHAINS` × each `FACTORY_ADAPTERS`.
- On failure for a (chain, adapter) pair: add `chain.id` to `unavailableChainIds`, continue.
- Dedupe map keyed by `address.toLowerCase()`.

`lib/hooks/useAccountDiscovery.ts`: client hook that calls `discoverAccounts` when `eoa` is set; returns `{ accounts, unavailableChainIds, isLoading, error, refetch }`.

- [ ] **Step 4: Commit**

```bash
git add lib/factories lib/hooks/useAccountDiscovery.ts
git commit -m "$(cat <<'EOF'
feat: add StationRegistry factory adapter and discovery

EOF
)"
```

---

### Task 5: Balances and USD prices

**Files:**

- Create: `lib/balances.ts`, `lib/prices.ts`, `lib/hooks/useUsdPrices.ts`, `lib/hooks/useSpaceBalances.ts`

**Interfaces:**

- Consumes: tokens, thirdweb chains/client
- Produces:

  - `fetchBalancesForAddress(address)` → per-chain token display values, with `unavailable: true` when a whole chain fails
  - `fetchUsdPrices()` / `useUsdPrices()` → `Record<SupportedToken, number>`
  - `useSpaceBalances(addresses)` → balances, fiat totals, loading, refetch

- [ ] **Step 1:** `lib/balances.ts`

Port `fetchBalancesForAddress` from `WERK/frontend/lib/hooks/useSpaceBalances.ts`.

Differences from reference:

1. Use local `SupportedToken` / `getTokensForChain` / `getTokenAddress` / `getNativeTokenSymbol`.
2. Per-token catch → `"0"` (keep).
3. Also wrap the whole chain in try/catch: on total chain failure return `{ name, nativeCurrency, tokens: {}, unavailable: true }` so the UI can show “Unavailable”.
4. Native detection: `symbol === getNativeTokenSymbol(chain.id)` OR `isNativeTokenAddress(getTokenAddress(symbol, chain.id))`. For native, omit `tokenAddress` in `getWalletBalance`.

Types:

```ts
export type ChainBalanceSummary = {
  name: string;
  nativeCurrency: string;
  tokens: Partial<Record<SupportedToken, string>>;
  unavailable?: boolean;
};

export type SpaceChainBalances = Record<number, ChainBalanceSummary>;
```

- [ ] **Step 2:** `lib/prices.ts` **+** `useUsdPrices`

USD only. Simplified CoinGecko (no multi-currency / Redux):

```ts
// Fetch USD prices from CoinGecko. Use each token defaultPrice on failure.
export async function fetchUsdPrices(): Promise<Record<SupportedToken, number>>;
```

Request: `https://api.coingecko.com/api/v3/simple/price?ids=<ids>&vs_currencies=usd` using every registry `coingeckoId`. Map each symbol to `data[id].usd ?? defaultPrice`. On network/HTTP error, return all `defaultPrice` values.

`useUsdPrices`: load on mount, cache with `PRICE_CACHE_MS`, expose `{ prices, isLoading }`.

- [ ] **Step 3:** `useSpaceBalances`

Port fiat aggregation from the reference hook (no deposit/withdraw event watcher in v1):

```ts
export function useSpaceBalances(addresses: string[]): {
  balances: Record<string, SpaceChainBalances>;
  fiatBySpaceAddress: Record<string, number>;
  isLoading: boolean;
  refetch: (addresses: string[]) => Promise<void>;
};
```

Row total = sum of `(Number(balance) * prices[symbol])` across all chains/tokens. Missing price → 0 for that term (defaultPrice should already fill).

- [ ] **Step 4: Commit**

```bash
git add lib/balances.ts lib/prices.ts lib/hooks/useUsdPrices.ts lib/hooks/useSpaceBalances.ts
git commit -m "$(cat <<'EOF'
feat: add balance fetch and USD price helpers

EOF
)"
```

---

### Task 6: Withdraw path

**Files:**

- Create: `lib/withdraw/abis.ts`, `lib/withdraw/executeViaSmartWallet.ts`, `lib/hooks/useWithdrawNative.ts`, `lib/hooks/useWithdrawERC20.ts`

**Interfaces:**

- Consumes: thirdweb client/chains, connected EOA account + `switchChain`
- Produces: hooks matching the spec `WithdrawHookResult` shapes

- [ ] **Step 1: ABIs**

```ts
// lib/withdraw/abis.ts
export const SPACE_EXECUTE_ABI = {
  /* execute(module, value, data) returns bool */
} as const;
export const WITHDRAW_NATIVE_ABI = {
  /* withdrawNative(to, amount) */
} as const;
export const WITHDRAW_ERC20_ABI = {
  /* withdrawERC20(to, token, amount) */
} as const;
```

Copy exact ABI objects from `packages/werk-sign/src/modules/shared.ts` and the withdraw misc modules.

- [ ] **Step 2:** `executeViaSmartWallet`

Standalone sequence (not werk-sign client). Do **not** deploy Spaces (already deployed via factory enum). Do **not** use thirdweb `smartWallet` / ERC-4337 UserOps.

```ts
import { encode, getContract, prepareContractCall, sendTransaction, waitForReceipt, type PreparedTransaction } from "thirdweb";
import type { Account } from "thirdweb/wallets";
import { client, getChain } from "@/lib/thirdweb";
import { SPACE_EXECUTE_ABI } from "./abis";

export type ExecuteViaSmartWalletParams = {
  account: Account;
  chainId: number;
  smartWalletAddress: `0x${string}`;
  innerCall: PreparedTransaction;
  switchChain: (chain: ReturnType<typeof getChain>) => Promise<void>;
  onStatus?: (status: "switching-chain" | "signing" | "confirming") => void;
};

// Wraps an inner smart-wallet call in execute and sends it from the EOA.
export async function executeViaSmartWallet(params: ExecuteViaSmartWalletParams): Promise<{ transactionHash: string }> {
  const { account, chainId, smartWalletAddress, innerCall, switchChain, onStatus } = params;

  onStatus?.("switching-chain");
  await switchChain(getChain(chainId));

  const data = await encode(innerCall);
  const smartWallet = getContract({
    address: smartWalletAddress,
    chain: getChain(chainId),
    client,
  });

  // Self-call: the Space allowlist permits address(this).
  const transaction = prepareContractCall({
    contract: smartWallet,
    method: SPACE_EXECUTE_ABI,
    params: [smartWalletAddress, 0n, data],
  });

  onStatus?.("signing");
  const result = await sendTransaction({ account, transaction });

  onStatus?.("confirming");
  const receipt = await waitForReceipt(result);
  return { transactionHash: receipt.transactionHash };
}
```

- [ ] **Step 3: Withdraw hooks**

Shared status type:

```ts
export type WithdrawStatus = "idle" | "switching-chain" | "signing" | "confirming" | "success" | "error";

export type WithdrawHookResult<TParams> = {
  execute: (params: TParams) => Promise<{ transactionHash: string }>;
  status: WithdrawStatus;
  error: (Error & { cancelled?: boolean }) | null;
  reset: () => void;
};
```

`useWithdrawNative`:

- Uses `useActiveAccount`, `useSwitchActiveWalletChain` from `thirdweb/react`.
- Builds `withdrawNative(to, toWei(amount))` on the Space contract.
- Calls `executeViaSmartWallet`.
- User rejection (`code === 4001` or name/message includes reject): `status = "idle"`, `error.cancelled = true`.
- Other failures: `status = "error"`.
- Success: `status = "success"`.

`useWithdrawERC20`: same with `withdrawERC20(to, token, toUnits(amount, decimals))`.

- [ ] **Step 4: Commit**

```bash
git add lib/withdraw lib/hooks/useWithdrawNative.ts lib/hooks/useWithdrawERC20.ts
git commit -m "$(cat <<'EOF'
feat: add Space.execute withdraw hooks for native and ERC-20

EOF
)"
```

---

### Task 7: Providers and root layout

**Files:**

- Create: `components/providers.tsx`
- Modify: `app/layout.tsx`, `app/globals.css` (if needed)

**Interfaces:**

- Consumes: `client`, `SUPPORTED_CHAINS`, `DEFAULT_CHAIN`
- Produces: ThemeProvider → ThirdwebProvider → Toaster → children

- [ ] **Step 1: Providers**

```tsx
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
```

- [ ] **Step 2: Root layout**

Metadata title/description: Meerkat. Wrap children in `<Providers>`. Keep a clean sans font (Geist is fine; no Werk fonts).

- [ ] **Step 3: Commit**

```bash
git add components/providers.tsx app/layout.tsx
git commit -m "$(cat <<'EOF'
feat: wire ThemeProvider and ThirdwebProvider

EOF
)"
```

---

### Task 8: Connect page (`/`)

**Files:**

- Modify: `app/page.tsx`
- Create: `lib/format.ts` (shortenAddress helper used by later pages too)

**Interfaces:**

- Consumes: `client`, `DEFAULT_WALLETS`, `SUPPORTED_CHAINS`, `DEFAULT_APP_METADATA`
- Produces: centered connect UI; client redirect to `/wallets` when connected

- [ ] **Step 1:** `shortenAddress`

```ts
// lib/format.ts
// Shortens a hex address for display.
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
```

- [ ] **Step 2: Connect page**

Client component page:

- `useActiveAccount()`; if present, `useRouter().replace("/wallets")`.
- Centered layout: product name **Meerkat**, one-line subtitle (“View and withdraw from smart wallets you own”), `ConnectEmbed` with `client`, `wallets={DEFAULT_WALLETS}`, `chain={DEFAULT_CHAIN}`, `chains={SUPPORTED_CHAINS}`, `appMetadata={DEFAULT_APP_METADATA}`, and WalletConnect project id via thirdweb wallet config if required by thirdweb v5 for `walletConnect`.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx lib/format.ts
git commit -m "$(cat <<'EOF'
feat: add connect page

EOF
)"
```

---

### Task 9: Wallets page + withdraw dialog

**Files:**

- Create: `app/wallets/page.tsx`, `components/wallets/*`

**Interfaces:**

- Consumes: discovery, balances, prices, withdraw hooks
- Produces: full wallets UX per spec screens section

- [ ] **Step 1: Page shell**

`app/wallets/page.tsx` (client):

- No EOA → `replace("/")`.
- Top bar: "Meerkat” left; shortened EOA + Disconnect right (`useDisconnect` / wallet disconnect → navigate `/`).
- Heading “Smart wallets” + count.
- Empty discovery (not loading): “No smart wallets found for this address.”
- Loading: skeletons.

- [ ] **Step 2: Wallet row + breakdown**

Each row:

- Expand control (Collapsible)
- Shortened address, copy button, explorer link for default chain (`getChain(1).blockExplorers[0].url/address/...`)
- Badge with `factoryLabel`
- Total USD from `fiatBySpaceAddress`

Expanded:

- For each `SUPPORTED_CHAINS`: network name; if that chain is in `unavailableChainIds` or `summary.unavailable`, show “Unavailable”; else list every token from `getTokensForChain` with balance and `$` (include zeros).
- One Withdraw button for the wallet.
- Disable Withdraw when `!usesSpaceWithdraw` OR no token on any chain has `Number(balance) > 0`.

- [ ] **Step 3: Withdraw dialog**

Fields:

1. Network — Select of `SUPPORTED_CHAINS` (only those with at least one token balance > 0 preferred; still list supported chains but asset list filters).
2. Asset — tokens on selected chain with balance > 0.
3. Amount — Input + Max; validate `<= balance`.
4. Recipient — regex `/^0x[a-fA-F0-9]{40}$/`; inline error if invalid.

Confirm:

- If native symbol or `isNativeTokenAddress(token)` → `useWithdrawNative`.
- Else → `useWithdrawERC20` with address + decimals from registry.
- User cancel: toast, keep dialog open.
- On-chain error: toast short message, `status=error`.
- Success: toast, close dialog, `refetch` that space’s balances.

- [ ] **Step 4: Commit**

```bash
git add app/wallets components/wallets
git commit -m "$(cat <<'EOF'
feat: add wallets list, breakdown, and withdraw dialog

EOF
)"
```

---

### Task 10: Final polish and manual checklist

**Files:**

- Touch any gaps found while wiring (env reads, explorer URLs for Base/HyperEVM, disconnect path)

- [ ] **Step 1: Spec coverage sweep**

Verify against the design spec:

- Routes `/` and `/wallets` client redirects only
- No AuthProvider / middleware cookie
- Only StationRegistry adapter in `FACTORY_ADAPTERS`
- Production chains only
- MIT + README + `.env.example`
- ASD-STE100 `//` comments on modules / exports / non-obvious branches
- Package name / README title = Meerkat

- [ ] **Step 2: Manual verification note**

Owner will run:

1. Set `.env.local` from `.env.example` (own keys; do not copy Werk env)
2. `yarn dev` on 3000
3. Connect EOA with a deployed Space
4. Expand / withdraw / disconnect

Do not run lint, typecheck, or build unless asked.

- [ ] **Step 3: Final commit if polish remaining**

```bash
git add -A
git status
# commit only if there are real polish changes
git commit -m "$(cat <<'EOF'
chore: polish meerkat v1 against design spec

EOF
)"
```

---

## Spec coverage (self-review)

| Spec area                                 | Task             |
| ----------------------------------------- | ---------------- |
| Stack / yarn / port 3000 / alias          | 1                |
| OSS (MIT, README, env example, gitignore) | 1                |
| shadcn zinc UI                            | 2                |
| Chains + thirdweb + tokens                | 3                |
| Factory adapter + discovery               | 4                |
| Balances + CoinGecko USD                  | 5                |
| Withdraw hooks + executeViaSmartWallet    | 6                |
| Providers                                 | 7                |
| Connect `/`                               | 8                |
| Wallets + dialog                          | 9                |
| Error handling / empty state / disconnect | 9–10             |
| No tests / no lint gate                   | Global + Task 10 |

## Placeholder scan

No TBD/TODO left in task steps. Token registry contents are “copy from reference and filter chain ids” (concrete source path given). ABI bodies are “copy exact objects from named reference files.”
