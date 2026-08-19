# Meerkat — Design Spec

Date: 2026-08-18
Status: approved in design review. Product name: **Meerkat**.

This spec is the source of truth for a **new open-source repository**. It is not a change to the Werk frontend. The Werk frontend at `WERK/frontend` is a **reference implementation** only.

## Goal

Build a small Next.js app where a user connects an EOA, sees every Werk Space smart account for that EOA, sees a USD total per account, expands a row for a per-network token breakdown, and withdraws to an address.

## Product decisions (locked)

- New git repository (in this folder already initialized). Not a package inside the Werk frontend.
- Separate product. Neutral professional UI. No Werk brand, colors, or copy.
- No Werk GraphQL backend, JWT cookie, SIWE, urql, Redux, or session providers.
- Wallet-only. thirdweb connection is the session.
- Factory layer is an adapter list. v1 implements **Werk StationRegistry only**. Other factories can be added later without changing the wallet list or withdraw UI.
- No manual “add address”. No EOA row.
- Open source. Comments use **ASD-STE100 Simplified Technical English** and the `//` form only (see Comment rules).

Product name: **Meerkat**. Repo: `meerkat`. Do not use “Werk” in the product name or README title.

## Stack

- Next.js 16 App Router (latest 16.x, same major as the Werk frontend), React 19, TypeScript strict, Tailwind v4, shadcn/ui. Next.js project already initialized.
- thirdweb v5, viem
- No React Compiler. Keep `useMemo` / `useCallback` / `memo` where they already pay for themselves.
- No GraphQL codegen. No Redux. No urql.
- Package manager: yarn (match the reference app).
- Dev server port **3000** (do not collide with Werk frontend on 8080).
- Path alias `@/*` → repo root.

## Open-source requirements

- MIT license (unless the owner names another license).
- README: what the app does, how to run it, env vars, which contracts it reads.
- `.env.example` with variable **names** only. Never commit secrets. Never copy `.env`\* from the Werk frontend.
- `.gitignore` includes `.env*`, `node_modules`, `.next`.
- Do not include PostHog, Across, or other Werk product analytics.

## Comment rules (ASD-STE100 + `//`)

This repository will be public. Every comment must follow ASD-STE100 Simplified Technical English.

**Form**

- Use `//` only. Do not use `/* */`. Do not use JSDoc `/** */`.
- Put a comment on the line above the code it describes, or at the end of a short line when the note is one clause.
- Comment every new module, exported function, and non-obvious branch. Do not comment the obvious (`// set count to 0`).

**Language**

- One idea per sentence. Short sentences.
- Present tense for facts: `// Returns the list of Space addresses.`
- Imperative for instructions: `// Call this after the wallet connects.`
- Active voice. Named subject when needed: `// The factory returns only deployed accounts.`
- Use `do not`, not `don't`. Do not use other contractions.
- Do not use: ensure, handle, leverage, should, simply, just, basically, allow (as a filler), process, helper, util, this/it with no noun.
- Do not write noun clusters longer than three words.
- Do not write what the next line of code already says.

**Examples**

```ts
// Gets all Space accounts for this EOA on this chain.
export async function listAccounts(eoa: string, chainId: number): Promise<string[]>;

// One RPC failure must not clear the list of other chains.
if (!result) {
  return { status: "unavailable" };
}

// Bad: /* Fetches stuff */
// Bad: /** @param eoa The user's eoa */
// Bad: // Helper to handle fetching and ensure we have spaces
```

Straight ASCII quotes only (`'` `"`). No curly quotes in code, comments, or strings.

## Architecture

```
ThemeProvider → ThirdwebProvider → App
```

No `AuthProvider`. No `SpaceSwitcherProvider`. No middleware cookie gate.

### Routes

| Path       | Behavior                                                                                |
| ---------- | --------------------------------------------------------------------------------------- |
| `/`        | Connect page. If an EOA is already connected, redirect to `/wallets`.                   |
| `/wallets` | Wallet list. If no EOA is connected, redirect to `/`. Disconnect sends the user to `/`. |

Client-side redirects only.

### Modules

| Module                             | Responsibility                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| `lib/thirdweb.ts`                  | Client, chains, default wallets, `getChain`                                          |
| `lib/tokens.ts`                    | Static token registry + `getTokenAddress` / `getTokensForChain` / `getTokenDecimals` |
| `lib/factories/types.ts`           | `FactoryAdapter` interface                                                           |
| `lib/factories/stationRegistry.ts` | v1 adapter: `getAccountsOfSigner`                                                    |
| `lib/factories/index.ts`           | Registry array. v1 contains StationRegistry only                                     |
| `lib/balances.ts`                  | `fetchBalancesForAddress`                                                            |
| `lib/prices.ts`                    | CoinGecko USD prices with registry `defaultPrice` fallback                           |
| `lib/withdraw/executeViaSmartWallet.ts` | Shared: wrap a smart-wallet call in `execute` and send it from the EOA            |
| `lib/hooks/useWithdrawNative.ts`   | Hook: native withdraw                                                                |
| `lib/hooks/useWithdrawERC20.ts`    | Hook: ERC-20 withdraw                                                                |
| `lib/constants.ts`                 | `STATION_REGISTRY_ADDRESS`                                                           |

### Factory adapter

```ts
export type FactoryAdapter = {
  id: string;
  label: string;
  // Returns smart-account addresses owned by this EOA on this chain.
  listAccounts: (eoa: `0x${string}`, chainId: number) => Promise<`0x${string}`[]>;
  // True when withdraw must use Space.withdrawNative / withdrawERC20.
  usesSpaceWithdraw: boolean;
};

export const FACTORY_ADAPTERS: FactoryAdapter[] = [stationRegistryAdapter];
```

v1: one adapter.

- `id`: `"station-registry"`
- `label`: `"Werk Space"` (this is a **source badge**, not product branding)
- `listAccounts`: `StationRegistry.getAccountsOfSigner(eoa)` on that chain
- `usesSpaceWithdraw`: `true`

Do not implement other factories in v1. Do not add stub adapters that return `[]`. Adding a factory later means appending one object to `FACTORY_ADAPTERS`.

Discovery:

1. For each supported chain, call every adapter’s `listAccounts(eoa, chainId)`.
2. Union and dedupe addresses (lowercase).
3. Tag each address with the adapter `id` / `label` that returned it. If two adapters return the same address, keep the first in `FACTORY_ADAPTERS` order.

StationRegistry is deployed at the same address on every Werk chain:

`0xf169648a758b767AD6775E2f7eD8337a0aE4685d`

Source: [StationRegistry.sol](https://github.com/xWerk/contracts/blob/main/src/StationRegistry.sol). The enumerable view lives on [BaseAccountFactory](https://github.com/xWerk/contracts/blob/main/src/utils/BaseAccountFactory.sol):

```
function getAccountsOfSigner(address signer) external view returns (address[] memory)
```

This set contains only accounts that called `onSignerAdded`. Counterfactual (never deployed) Spaces do not appear. That is accepted for v1.

### Chains

Production networks only. No testnets. No `NEXT_PUBLIC_APP_ENV` chain split.

`SUPPORTED_CHAINS` is always:

| Network  | Chain id | Alchemy RPC host                    |
| -------- | -------- | ----------------------------------- |
| Ethereum | `1`      | `eth-mainnet.g.alchemy.com`         |
| Base     | `8453`   | `base-mainnet.g.alchemy.com`        |
| HyperEVM | `999`    | `hyperliquid-mainnet.g.alchemy.com` |

Copy the production `defineChain` blocks and RPC URL pattern from `WERK/frontend/lib/thirdweb.ts` (`ethereumCustom`, `baseCustom`, `hyperEVMCustom`). Do not copy `sepoliaCustom` or `baseSepoliaCustom`. Do not gate chains on an env flag.

Default chain: Ethereum (first in `SUPPORTED_CHAINS`). Do not remove `switchChain` or multi-chain support.

Default wallets (match the reference app): in-app, WalletConnect, MetaMask, Coinbase, Rabby, Zerion.

### Tokens

Copy `WERK/frontend/lib/generated/tokenRegistry.ts` as a static file. Do not generate it from GraphQL. Replace the `SupportedToken` GraphQL enum with a local string-union or local enum. Keep only addresses for chain ids `1`, `8453`, and `999`. Drop Sepolia (`11155111`) and Base Sepolia (`84532`) entries.

Symbols: `USDC`, `EURC`, `USDT`, `USDT0`, `TGBP`, `JPYC`, `XSGD`, `ZCHF`, `ETH`, `UETH`, `HYPE`.

Native assets in the registry use `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` (ERC-7528 / thirdweb `NATIVE_TOKEN_ADDRESS`). Treat that address as native: read the account balance, withdraw with `withdrawNative`.

A token with no registry address on a chain is not shown for that chain.

### Balances and USD

Reuse the algorithm in `WERK/frontend/lib/hooks/useSpaceBalances.ts` (`fetchBalancesForAddress`):

- For each supported chain, for each token from `getTokensForChain(chainId)`, call thirdweb `getWalletBalance`.
- Isolate per-token failures. A failed token reads as `"0"` and does not blank the chain.
- Prices: CoinGecko, **USD only**. No currency switcher.
- If CoinGecko fails, use each token’s `defaultPrice`.
- Row total = sum of (balance × USD price) across all chains and tokens.

### Withdraw hooks (v1, StationRegistry Spaces only)

Each Space withdraw method is its **own hook**, same split as the reference app (`useWithdrawNative`, `useWithdrawERC20`). Do not put both methods in one `useWithdraw`. A later method (for example `withdrawERC721`) is a new hook that reuses `executeViaSmartWallet`.

Do **not** connect a thirdweb `smartWallet` and do **not** send an ERC-4337 UserOp. Do **not** copy `useTransactionAction` or the werk-sign overlay/review machine.

**Shared send path** (`lib/withdraw/executeViaSmartWallet.ts`) — copy the sequence from `packages/werk-sign/src/modules/shared.ts` `executeViaSpace`, rename locally to `executeViaSmartWallet`, and do not copy the file:

1. `switchChain` the connected EOA to the selected network. Do not remove `switchChain`.
2. The Space is already deployed (it came from `getAccountsOfSigner`).
3. Wrap the inner call as `Space.execute(spaceAddress, 0, calldata)`. This is a self-call. The Space allowlist permits `address(this)`.
4. `sendTransaction` with the **EOA** as `account`. The EOA pays gas. Funds leave the Space.
5. Wait for the receipt. Return `{ transactionHash }`.

**Hook contract** (same return shape on every withdraw hook):

```ts
type WithdrawStatus = "idle" | "switching-chain" | "signing" | "confirming" | "success" | "error";

type WithdrawHookResult<TParams> = {
  execute: (params: TParams) => Promise<{ transactionHash: string }>;
  status: WithdrawStatus;
  error: Error | null;
  reset: () => void;
};

type WithdrawNativeParams = {
  chainId: number;
  spaceAddress: `0x${string}`;
  to: `0x${string}`;
  amount: string; // human-readable, converted with toWei inside the hook
};

type WithdrawERC20Params = {
  chainId: number;
  spaceAddress: `0x${string}`;
  to: `0x${string}`;
  token: `0x${string}`;
  amount: string; // human-readable
  decimals: number;
};
```

- `useWithdrawNative(): WithdrawHookResult<WithdrawNativeParams>` — builds `withdrawNative(to, amount)`.
- `useWithdrawERC20(): WithdrawHookResult<WithdrawERC20Params>` — builds `withdrawERC20(to, token, amount)` with `toUnits(amount, decimals)`.

User rejection (`4001` / `UserRejectedRequestError`) sets `status: "idle"` and `error` with a cancelled flag. The dialog stays open. An on-chain revert sets `status: "error"`. Success sets `status: "success"`; the dialog toasts, closes, and refetches that Space.

ABIs to copy (not the rest of werk-sign):

`withdrawNative(address to, uint256 amount)`  
`withdrawERC20(address to, address token, uint256 amount)`  
`execute(address module, uint256 value, bytes data) returns (bool)`

**Dialog wiring:** if the selected asset is the chain native symbol (`ETH` on Ethereum and Base, `HYPE` on HyperEVM) or the token address is `NATIVE_TOKEN_ADDRESS`, call `useWithdrawNative`. Otherwise call `useWithdrawERC20`.

If a future adapter has `usesSpaceWithdraw: false`, v1 must disable Withdraw for those rows (no generic `execute` path in v1). All v1 rows are StationRegistry, so Withdraw is enabled when any token balance is greater than 0.

## Screens

Neutral shadcn. Zinc/slate. Plenty of whitespace. No Werk purple. No extreme decoration.

### Connect (`/`)

Centered: **Meerkat**, one-line subtitle, thirdweb `ConnectEmbed`. On connect → `/wallets`.

### Wallets (`/wallets`)

Top bar: **Meerkat** left; shortened EOA + disconnect right.

Heading: “Smart wallets” and a count.

Row:

- Expand control
- Shortened address, copy button, explorer link on the default chain
- Source badge from the adapter label (`Werk Space`)
- Total USD

Expand:

- Every supported **network** in `SUPPORTED_CHAINS`
- On each network, **every supported token** for that chain, including balance `0` and `$0.00`
- One **Withdraw** button for the wallet (not per chain)
- Disable Withdraw when no token on any chain has a balance greater than 0 (do not use the USD total; a CoinGecko miss can price HYPE/ETH at 0)

Empty factory result: “No smart wallets found for this address.” Not an error.

### Withdraw dialog

Fields:

1. Network — supported chains
2. Asset — tokens on that chain with balance **> 0** (the expanded table shows zeros; the dialog does not offer them)
3. Amount — with a max control; cannot exceed balance
4. Recipient — `0x` + 40 hex chars

Confirm runs the withdraw flow above.

## Error handling

- One chain’s `getAccountsOfSigner` or balance RPC fails: keep other chains. Show that network as “Unavailable” in the breakdown. Do not empty the list.
- CoinGecko fails: `defaultPrice`.
- `/wallets` without a connected EOA: redirect to `/`.
- Invalid recipient: inline error.
- Amount greater than balance: inline error.
- User rejects the signature: toast, dialog stays open.
- On-chain revert: toast with a short message. No automatic retry.
- `[]` from the factory: empty state.

## What to copy from WERK/frontend

Copy by hand into the new repo. Do not add this frontend as a dependency.

- Production chain + Alchemy RPC pattern only: `ethereumCustom`, `baseCustom`, `hyperEVMCustom` in `lib/thirdweb.ts` (skip Sepolia / Base Sepolia)
- Token registry: `lib/generated/tokenRegistry.ts` + lookup functions in `lib/tokenRegistry.ts`
- `STATION_REGISTRY_ADDRESS` in `lib/constants.ts`
- Balance fetch: `fetchBalancesForAddress` in `lib/hooks/useSpaceBalances.ts`
- Withdraw ABIs and `executeViaSmartWallet` **sequence** (adapted from werk-sign `executeViaSpace`; not `useTransactionAction`, review UI, or GraphQL): `packages/werk-sign/src/modules/misc/withdrawNative.ts`, `withdrawERC20.ts`, `packages/werk-sign/src/modules/shared.ts`. Hook split only: `packages/werk-sign/src/react/useWithdrawNative.ts`, `useWithdrawERC20.ts` (each hook is one method; do not copy the overlay).
- shadcn primitives: compose; do not fork for page-specific needs

## What not to copy

- `providers/AuthProvider.tsx`, `providers/SpaceSwitcherProvider.tsx`
- urql, Redux, `middleware.ts`, `queries/`, `types/graphql.ts`
- PostHog, Across, onboarding, invoices, compensation, bridge
- `components/dialogs/Withdraw.tsx` (GraphQL recipients and activity history)
- Werk theme tokens and brand assets

## Environment variables

Names only (put these in `.env.example`):

- `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`
- `NEXT_PUBLIC_ALCHEMY_RPC`
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`

Do not read Werk `.env*` files.

## Verification (no test suite)

v1 has no automated tests (same as the Werk frontend). Manual check will be performed by the user:

1. `yarn dev` on port 3000
2. Connect a wallet that owns at least one deployed Space on Ethereum, Base, or HyperEVM
3. See the Space list and USD totals
4. Expand: all networks and all tokens visible, including zeros
5. Withdraw a small amount of a funded asset to a recipient you control
6. Disconnect returns to `/`

Do not run lint, typecheck, or build unless the owner asks.

## Out of scope (v1)

- SIWE / backend session
- Manual add-address
- EOA as a list row
- Other AA factories (adapter slot only)
- Withdraw from non-Space accounts
- Gas sponsorship
- Bridging, invoices, compensation, ENS from the Werk backend
- Currency switcher (USD only)
- Automated tests
- Testnets (Sepolia, Base Sepolia) and any `APP_ENV` chain split
