# Meerkat

Meerkat is an open-source Next.js app for viewing StationRegistry data on-chain. Connect a wallet to browse registered stations across supported networks.

Meerkat reads the StationRegistry contract at `0xf169648a758b767AD6775E2f7eD8337a0aE4685d` on Ethereum, Base, and HyperEVM.

## Getting started

Install dependencies:

```bash
yarn install
```

Copy the example environment file and fill in the required values:

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
| `NEXT_PUBLIC_ALCHEMY_RPC` | Alchemy RPC URL for on-chain reads |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | WalletConnect project ID |

## License

MIT — see [LICENSE](LICENSE).
