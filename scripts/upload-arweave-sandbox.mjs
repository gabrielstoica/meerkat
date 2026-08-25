import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// CJS load: the SDK ESM entry conflicts with thirdweb's @solana/* versions.
const require = createRequire(import.meta.url);
const { TurboFactory, OnDemandFunding, SOLToTokenAmount } = require("@ardrive/turbo-sdk");
const bs58 = require("bs58").default;
const nacl = require("tweetnacl");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "out");
const KEYPAIR_PATH = path.join(ROOT, "scripts", ".ar-io-sandbox-keypair.json");
const SOLANA_RPC = "https://api.devnet.solana.com";
const SANDBOX_GATEWAY = "https://ar-io.dev";
const LAMPORTS_PER_SOL = 1_000_000_000;

// Uploads the static `out/` folder to the ar.io testnet sandbox.
// Data is ephemeral (~3 days) and never posted to mainnet Arweave.
async function main() {
  await assertOutDir();
  const secretKey = await loadOrCreateSecretKey();
  const publicKey = secretKey.slice(32);
  const address = bs58.encode(publicKey);

  console.log(`Solana devnet signer: ${address}`);

  const turbo = TurboFactory.authenticated({
    privateKey: bs58.encode(secretKey),
    token: "solana",
    gatewayUrl: SOLANA_RPC,
    uploadServiceConfig: { url: "https://upload.services.ar-io.dev" },
    paymentServiceConfig: { url: "https://payment.services.ar-io.dev" },
  });

  let { winc } = await turbo.getBalance();
  console.log(`Turbo credit balance (winc): ${winc}`);

  let canPay = BigInt(winc) > 0n;
  if (!canPay) {
    try {
      await ensureDevnetSol(address);
      console.log("Topping up sandbox Turbo credits with 0.05 SOL...");
      const topUp = await turbo.topUpWithTokens({
        tokenAmount: SOLToTokenAmount(0.05),
      });
      console.log(`Top-up status: ${topUp.status} tx: ${topUp.id}`);
      ({ winc } = await turbo.getBalance());
      canPay = BigInt(winc) > 0n || true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Could not fund credits automatically: ${message}`);
      console.warn(`If the upload needs payment, send Devnet SOL to ${address}`);
      console.warn("Faucet: https://faucet.solana.com/");
    }
  }

  console.log(`Uploading ${OUT_DIR} ...`);
  const result = await turbo.uploadFolder({
    folderPath: OUT_DIR,
    dataItemOpts: {
      tags: [
        { name: "App-Name", value: "Meerkat" },
        { name: "App-Version", value: "sandbox" },
      ],
    },
    throwOnFailure: true,
    manifestOptions: {
      indexFile: "index.html",
      fallbackFile: "404.html",
    },
    ...(canPay
      ? {
          fundingMode: new OnDemandFunding({
            maxTokenAmount: SOLToTokenAmount(0.2),
            topUpBufferMultiplier: 1.2,
          }),
        }
      : {}),
    events: {
      onFolderProgress: ({ processedFiles, totalFiles, currentPhase }) => {
        if (currentPhase === "manifest" || processedFiles === totalFiles || processedFiles % 100 === 0) {
          console.log(`  ${currentPhase}: ${processedFiles}/${totalFiles} files`);
        }
      },
      onFileError: ({ fileName, error }) => {
        console.error(`  failed ${fileName}: ${error.message}`);
      },
    },
  });

  const manifestId = result.manifestResponse?.id;
  if (!manifestId) {
    throw new Error("Upload finished without a manifest id.");
  }

  console.log("");
  console.log("Sandbox upload complete. Data purges after about 3 days.");
  console.log(`Manifest id: ${manifestId}`);
  console.log(`Gateway:     ${SANDBOX_GATEWAY}/${manifestId}/`);
  console.log(`Wallets:     ${SANDBOX_GATEWAY}/${manifestId}/wallets/`);
}

async function assertOutDir() {
  try {
    const info = await stat(OUT_DIR);
    if (!info.isDirectory()) {
      throw new Error("not a directory");
    }
  } catch {
    throw new Error("No out/ folder. Run `yarn build:arweave` first.");
  }

  const html404 = path.join(OUT_DIR, "404.html");
  const slash404 = path.join(OUT_DIR, "404", "index.html");
  try {
    await stat(html404);
  } catch {
    try {
      await stat(slash404);
      await copyFile(slash404, html404);
      console.log("Copied 404/index.html to 404.html for the Turbo fallback.");
    } catch {
      console.warn("No 404.html in out/. Unknown paths will not have a fallback.");
    }
  }
}

async function loadOrCreateSecretKey() {
  try {
    const raw = JSON.parse(await readFile(KEYPAIR_PATH, "utf8"));
    if (!Array.isArray(raw) || raw.length !== 64) {
      throw new Error("invalid keypair file");
    }
    return Uint8Array.from(raw);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code !== "ENOENT") {
      throw error;
    }
    const pair = nacl.sign.keyPair();
    await mkdir(path.dirname(KEYPAIR_PATH), { recursive: true });
    await writeFile(KEYPAIR_PATH, JSON.stringify(Array.from(pair.secretKey)));
    console.log(`Wrote throwaway keypair to ${path.relative(ROOT, KEYPAIR_PATH)}`);
    return pair.secretKey;
  }
}

async function ensureDevnetSol(address) {
  const balance = await rpc("getBalance", [address]);
  const lamports = balance?.value ?? 0;
  console.log(`Devnet SOL balance: ${lamports / LAMPORTS_PER_SOL} SOL`);
  if (lamports >= 0.05 * LAMPORTS_PER_SOL) {
    return;
  }

  const amounts = [100_000_000, 50_000_000, 1_000_000_000];
  let lastError = new Error("No airdrop amount succeeded.");
  for (const amount of amounts) {
    try {
      console.log(`Requesting ${amount / LAMPORTS_PER_SOL} SOL airdrop from Solana devnet...`);
      const signature = await rpc("requestAirdrop", [address, amount]);
      console.log(`Airdrop signature: ${signature}`);
      await confirmSignature(signature);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Airdrop of ${amount / LAMPORTS_PER_SOL} SOL failed: ${lastError.message}`);
    }
  }
  throw lastError;
}

async function confirmSignature(signature) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const status = await rpc("getSignatureStatuses", [[signature], { searchTransactionHistory: true }]);
    const value = status?.value?.[0];
    if (value?.confirmationStatus === "confirmed" || value?.confirmationStatus === "finalized") {
      return;
    }
    if (value?.err) {
      throw new Error(`Airdrop failed: ${JSON.stringify(value.err)}`);
    }
    await sleep(2000);
  }
  throw new Error("Timed out while waiting for the SOL airdrop.");
}

async function rpc(method, params) {
  const response = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await response.json();
  if (body.error) {
    throw new Error(`${method} failed: ${body.error.message ?? JSON.stringify(body.error)}`);
  }
  return body.result;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
