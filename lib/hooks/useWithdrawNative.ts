"use client";

import { useCallback, useState } from "react";
import { getContract, prepareContractCall, toWei } from "thirdweb";
import { useActiveAccount, useSwitchActiveWalletChain } from "thirdweb/react";
import { client, getChain } from "@/lib/thirdweb";
import { WITHDRAW_NATIVE_ABI } from "@/lib/withdraw/abis";
import { executeViaSmartWallet, isUserRejection } from "@/lib/withdraw/executeViaSmartWallet";

export type WithdrawStatus = "idle" | "switching-chain" | "signing" | "confirming" | "success" | "error";

export type WithdrawHookResult<TParams> = {
  execute: (params: TParams) => Promise<{ transactionHash: string }>;
  status: WithdrawStatus;
  error: (Error & { cancelled?: boolean }) | null;
  reset: () => void;
};

export type WithdrawNativeParams = {
  chainId: number;
  spaceAddress: `0x${string}`;
  to: `0x${string}`;
  amount: string;
};

type WithdrawError = Error & { cancelled?: boolean };

function toWithdrawError(caught: unknown): WithdrawError {
  return (caught instanceof Error ? caught : new Error("Withdraw failed")) as WithdrawError;
}

// Native token withdraw through Space.execute. The EOA signs and pays gas.
export function useWithdrawNative(): WithdrawHookResult<WithdrawNativeParams> {
  const account = useActiveAccount();
  const switchChain = useSwitchActiveWalletChain();
  const [status, setStatus] = useState<WithdrawStatus>("idle");
  const [error, setError] = useState<WithdrawError | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  const execute = useCallback(
    async (params: WithdrawNativeParams) => {
      // A connected EOA is required to sign and pay gas.
      if (!account) {
        const missing = new Error("No connected wallet") as WithdrawError;
        setStatus("error");
        setError(missing);
        throw missing;
      }

      setError(null);

      try {
        const space = getContract({
          address: params.spaceAddress,
          chain: getChain(params.chainId),
          client,
        });

        const innerCall = prepareContractCall({
          contract: space,
          method: WITHDRAW_NATIVE_ABI,
          params: [params.to, toWei(params.amount)],
        });

        const result = await executeViaSmartWallet({
          account,
          chainId: params.chainId,
          smartWalletAddress: params.spaceAddress,
          innerCall,
          switchChain,
          onStatus: setStatus,
        });

        setStatus("success");
        return result;
      } catch (caught) {
        const nextError = toWithdrawError(caught);
        // The user rejects the signature prompt. The dialog stays open.
        if (isUserRejection(caught)) {
          nextError.cancelled = true;
          setStatus("idle");
          setError(nextError);
          throw nextError;
        }
        setStatus("error");
        setError(nextError);
        throw nextError;
      }
    },
    [account, switchChain]
  );

  return { execute, status, error, reset };
}
