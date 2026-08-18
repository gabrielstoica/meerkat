import {
  encode,
  getContract,
  prepareContractCall,
  sendTransaction,
  waitForReceipt,
  type PreparedTransaction,
} from "thirdweb";
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

// Sends a Space.execute self-call from the connected EOA. Does not deploy Spaces. Does not use ERC-4337 UserOps.
export async function executeViaSmartWallet(
  params: ExecuteViaSmartWalletParams
): Promise<{ transactionHash: string }> {
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
    params: [smartWalletAddress, BigInt(0), data],
  });

  onStatus?.("signing");
  const result = await sendTransaction({ account, transaction });

  onStatus?.("confirming");
  const receipt = await waitForReceipt(result);
  return { transactionHash: receipt.transactionHash };
}

// True when the user rejects the wallet prompt (EIP-1193 code 4001).
export function isUserRejection(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current != null; depth++) {
    if (typeof current !== "object") {
      return false;
    }
    const candidate = current as {
      code?: unknown;
      name?: unknown;
      message?: unknown;
      cause?: unknown;
    };
    if (candidate.code === 4001 || candidate.code === "4001") {
      return true;
    }
    const name = typeof candidate.name === "string" ? candidate.name : "";
    const message = typeof candidate.message === "string" ? candidate.message : "";
    if (name.toLowerCase().includes("reject") || message.toLowerCase().includes("reject")) {
      return true;
    }
    // Wallet libraries wrap the original 4001 error. Walk nested causes.
    current = candidate.cause;
  }
  return false;
}
