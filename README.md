# Meerkat

Meerkat is an open-source Next.js app. Connect an EOA to list Werk Space smart wallets from StationRegistry, see USD totals and per-network token balances, and withdraw to an address.

Meerkat reads the StationRegistry contract at `0xf169648a758b767AD6775E2f7eD8337a0aE4685d` on Ethereum, Base, and HyperEVM. Withdraw calls `Space.withdrawNative` or `Space.withdrawERC20`, wrapped in `Space.execute`. The connected EOA signs and pays gas.

## Getting started

Install dependencies:

```bash
yarn install
```

Copy the example environment file and fill in the required values. Use your own keys. Do not copy env files from other apps.

```bash
cp .env.example .env.local
```

Start the development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | Thirdweb client ID for wallet connection |
| `NEXT_PUBLIC_ALCHEMY_RPC` | Alchemy API key. The app inserts this value into Alchemy RPC URLs. |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | WalletConnect project ID |

## License

MIT — see [LICENSE](LICENSE).
