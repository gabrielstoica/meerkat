import { copyFile, readFile, stat } from "node:fs/promises";
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
const LAMPORTS_PER_SOL = 1_000_000_000;
const MIN_SOL_LAMPORTS = 50_000_000;

// Uploads the static `out/` folder to Arweave mainnet through production Turbo.
// Point https://meerkat.ar.io at the printed manifest id in https://arns.ar.io
async function main() {
  await loadDotEnvLocal();
  await assertOutDir();
  const secretKey = loadSecretKey();
  const address = bs58.encode(secretKey.slice(32));
  const solanaRpc = process.env.SOLANA_MAINNET_RPC ?? "https://api.mainnet-beta.solana.com";

  console.log(`Solana mainnet signer: ${address}`);

  const lamports = await getSolBalance(address, solanaRpc);
  console.log(`Mainnet SOL balance: ${lamports / LAMPORTS_PER_SOL} SOL`);
  if (lamports < MIN_SOL_LAMPORTS) {
    throw new Error(
      `Need at least 0.05 SOL on ${address} for Turbo payment and fees. This is not the ArNS owner wallet unless you choose the same key.`,
    );
  }

  const turbo = TurboFactory.authenticated({
    privateKey: bs58.encode(secretKey),
    token: "solana",
    gatewayUrl: solanaRpc,
  });

  const { winc } = await turbo.getBalance();
  console.log(`Turbo credit balance (winc): ${winc}`);

  console.log(`Uploading ${OUT_DIR} ...`);
  const result = await turbo.uploadFolder({
    folderPath: OUT_DIR,
    dataItemOpts: {
      tags: [
        { name: "App-Name", value: "Meerkat" },
        { name: "App-Version", value: "mainnet" },
      ],
    },
    throwOnFailure: true,
    manifestOptions: {
      indexFile: "index.html",
      fallbackFile: "404.html",
    },
    fundingMode: new OnDemandFunding({
      maxTokenAmount: SOLToTokenAmount(0.5),
      topUpBufferMultiplier: 1.2,
    }),
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
  console.log("Mainnet upload complete. Data is permanent.");
  console.log(`Manifest id: ${manifestId}`);
  console.log(`Direct:      https://arweave.net/${manifestId}/`);
  console.log("");
  console.log("Set Target ID on meerkat in https://arns.ar.io (Manage Assets).");
  console.log("Then open https://meerkat.ar.io");
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

async function loadDotEnvLocal() {
  try {
    const text = await readFile(path.join(ROOT, ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const eq = trimmed.indexOf("=");
      if (eq === -1) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

function secretKeyFromBase58(value) {
  let bytes;
  try {
    bytes = bs58.decode(value.trim());
  } catch {
    throw new Error("ARIO_MAINNET_SECRET is not valid base58.");
  }
  if (bytes.length === 64) {
    return Uint8Array.from(bytes);
  }
  if (bytes.length === 32) {
    return nacl.sign.keyPair.fromSeed(bytes).secretKey;
  }
  throw new Error(`ARIO_MAINNET_SECRET decoded to ${bytes.length} bytes. Need a 32-byte seed or a 64-byte secret.`);
}

function loadSecretKey() {
  const fromEnv = process.env.ARIO_MAINNET_SECRET?.trim();
  if (!fromEnv) {
    throw new Error(
      "Set ARIO_MAINNET_SECRET in .env.local to your Solana wallet secret (base58).",
    );
  }
  return secretKeyFromBase58(fromEnv);
}

async function getSolBalance(address, solanaRpc) {
  const response = await fetch(solanaRpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [address] }),
  });
  const body = await response.json();
  if (body.error) {
    throw new Error(`getBalance failed: ${body.error.message ?? JSON.stringify(body.error)}`);
  }
  return body.result?.value ?? 0;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
