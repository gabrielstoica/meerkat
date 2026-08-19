import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ANT, ARIO, DEVNET_PROGRAM_IDS, mARIOToken } from "@ar.io/sdk";
import {
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
} from "@solana/kit";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const KEYPAIR_PATH = path.join(ROOT, "scripts", ".ar-io-sandbox-keypair.json");
const SOLANA_RPC = "https://api.devnet.solana.com";
const SOLANA_WS = "wss://api.devnet.solana.com";
const LAMPORTS_PER_SOL = 1_000_000_000;
const MIN_SOL_LAMPORTS = 20_000_000;
const NAME_PATTERN = /^[a-z0-9]([a-z0-9-]{0,49}[a-z0-9])?$/;

// Buys a sandbox ArNS name on Solana devnet with the throwaway upload signer.
// Docs: https://docs.ar.io/build/testnet/arns/#advanced-buying-directly-with-the-sdk
async function main() {
  const options = parseArgs(process.argv.slice(2));
  const secretKey = await loadSecretKey();
  const signer = await createKeyPairSignerFromBytes(secretKey);

  console.log(`Solana devnet signer: ${signer.address}`);
  console.log(`Name: ${options.name} (${options.type}, ${options.years} year${options.years === 1 ? "" : "s"})`);

  const rpc = createSolanaRpc(SOLANA_RPC);
  const rpcSubscriptions = createSolanaRpcSubscriptions(SOLANA_WS);
  const ario = ARIO.init({
    rpc,
    rpcSubscriptions,
    signer,
    coreProgramId: DEVNET_PROGRAM_IDS.core,
    garProgramId: DEVNET_PROGRAM_IDS.gar,
    arnsProgramId: DEVNET_PROGRAM_IDS.arns,
    antProgramId: DEVNET_PROGRAM_IDS.ant,
  });

  const existing = await readExistingRecord(ario, options.name);
  if (existing) {
    console.log("Name is already registered:");
    console.log(JSON.stringify(existing, null, 2));
    if (!options.txId) {
      console.log(`Resolve: https://${options.name}.ar-io.dev`);
      return;
    }
    await pointName({ ario, rpc, rpcSubscriptions, signer, name: options.name, txId: options.txId });
    return;
  }

  const balance = await ario.getBalance({ address: signer.address });
  const { value: lamports } = await rpc.getBalance(signer.address).send();
  const cost = await ario.getTokenCost({
    intent: "Buy-Name",
    name: options.name,
    type: options.type,
    years: options.years,
  });
  console.log(`Staging ARIO balance: ${new mARIOToken(balance).toARIO().toString()}`);
  console.log(`Devnet SOL balance: ${Number(lamports) / LAMPORTS_PER_SOL} SOL`);
  console.log(`Quoted cost: ${new mARIOToken(cost).toARIO().toString()} ARIO`);

  if (options.dryRun) {
    console.log("Dry run. No purchase was sent.");
    return;
  }

  if (balance < cost) {
    throw new Error(
      `Not enough staging ARIO. Claim to ${signer.address} at https://faucet.services.ar-io.dev`,
    );
  }

  if (lamports < BigInt(MIN_SOL_LAMPORTS)) {
    throw new Error(
      `Devnet SOL balance is ${Number(lamports) / LAMPORTS_PER_SOL}. Buy-Name pays a Solana fee and rent. Send at least 0.02 SOL to ${signer.address} from https://faucet.solana.com`,
    );
  }

  console.log("Buying name on Solana devnet...");
  const record = await ario.buyRecord(
    {
      name: options.name,
      type: options.type,
      years: options.years,
      ...(options.txId ? { antState: { transactionId: options.txId, ticker: "MEERKAT" } } : {}),
    },
    {
      tags: [{ name: "App-Name", value: "Meerkat" }],
      onSigningProgress: (step) => {
        console.log(`  ${step}`);
      },
    },
  );

  console.log("Purchase result:");
  console.log(JSON.stringify(record, null, 2));
  console.log("");
  console.log(`Resolve: https://${options.name}.ar-io.dev`);
  if (options.txId) {
    console.log(`Target:  https://ar-io.dev/${options.txId}/`);
  }
}

function parseArgs(argv) {
  const options = { name: "", type: "lease", years: 1, dryRun: false, txId: "" };
  const rest = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--type") {
      options.type = requireValue(argv, ++i, "--type");
      continue;
    }
    if (arg === "--years") {
      options.years = Number(requireValue(argv, ++i, "--years"));
      continue;
    }
    if (arg === "--tx") {
      options.txId = requireValue(argv, ++i, "--tx");
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown flag: ${arg}`);
    }
    rest.push(arg);
  }

  options.name = (rest[0] ?? "").trim().toLowerCase();
  if (!options.name) {
    throw new Error(
      "Usage: yarn buy:arns-sandbox -- <name> [--years 1] [--type lease] [--tx <manifestId>] [--dry-run]",
    );
  }
  if (!NAME_PATTERN.test(options.name)) {
    throw new Error("Name must be 1-51 characters: lowercase letters, digits, and hyphens.");
  }
  if (options.type !== "lease" && options.type !== "permabuy") {
    throw new Error("--type must be lease or permabuy.");
  }
  if (!Number.isInteger(options.years) || options.years < 1 || options.years > 5) {
    throw new Error("--years must be an integer from 1 to 5.");
  }
  if (options.txId && !/^[A-Za-z0-9_-]{43}$/.test(options.txId)) {
    throw new Error("--tx must be a 43-character Arweave transaction id.");
  }

  return options;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value) {
    throw new Error(`${flag} needs a value.`);
  }
  return value;
}

async function loadSecretKey() {
  let raw;
  try {
    raw = JSON.parse(await readFile(KEYPAIR_PATH, "utf8"));
  } catch {
    throw new Error(
      `No sandbox keypair at ${path.relative(ROOT, KEYPAIR_PATH)}. Run yarn upload:ar-io-sandbox first.`,
    );
  }
  if (!Array.isArray(raw) || raw.length !== 64) {
    throw new Error("Sandbox keypair file is invalid.");
  }
  return Uint8Array.from(raw);
}

async function readExistingRecord(ario, name) {
  try {
    return await ario.getArNSRecord({ name });
  } catch {
    return null;
  }
}

async function pointName({ ario, rpc, rpcSubscriptions, signer, name, txId }) {
  const record = await ario.getArNSRecord({ name });
  const processId = record.processId;
  if (!processId) {
    throw new Error("Registered name has no ANT process id.");
  }

  console.log(`Pointing @ at ${txId} (ANT ${processId})...`);
  const ant = await ANT.init({
    processId,
    rpc,
    rpcSubscriptions,
    signer,
    antProgramId: DEVNET_PROGRAM_IDS.ant,
  });
  const result = await ant.setBaseNameRecord({
    transactionId: txId,
    ttlSeconds: 3600,
  });
  console.log("Record update:");
  console.log(JSON.stringify(result, null, 2));
  console.log(`Resolve: https://${name}.ar-io.dev`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
