"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { fundedTokensForChain } from "@/components/wallets/wallet-breakdown";
import type { SpaceChainBalances } from "@/lib/balances";
import { useWithdrawERC20 } from "@/lib/hooks/useWithdrawERC20";
import { useWithdrawNative, type WithdrawStatus } from "@/lib/hooks/useWithdrawNative";
import { SUPPORTED_CHAINS } from "@/lib/thirdweb";
import {
  getNativeTokenSymbol,
  getTokenAddress,
  getTokenDecimals,
  isNativeTokenAddress,
  type SupportedToken,
} from "@/lib/tokens";

const RECIPIENT_PATTERN = /^0x[a-fA-F0-9]{40}$/;

type WithdrawDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceAddress: `0x${string}`;
  chainBalances: SpaceChainBalances | undefined;
  onSuccess: () => void;
};

type SelectItemOption = { label: string; value: string | null };

// Picks a network that already has a token balance greater than 0.
function firstFundedChainId(chainBalances: SpaceChainBalances | undefined): number {
  const funded = SUPPORTED_CHAINS.find(
    (chain) => fundedTokensForChain(chainBalances, chain.id).length > 0
  );
  return funded?.id ?? SUPPORTED_CHAINS[0].id;
}

function shortErrorMessage(error: Error): string {
  const line = error.message.split("\n")[0]?.trim() || "Withdraw failed.";
  if (line.length > 140) {
    return `${line.slice(0, 137)}...`;
  }
  return line;
}

function confirmLabel(status: WithdrawStatus): string {
  if (status === "switching-chain") {
    return "Switching network";
  }
  if (status === "signing") {
    return "Confirm in wallet";
  }
  if (status === "confirming") {
    return "Confirming";
  }
  return "Confirm";
}

function isBusy(status: WithdrawStatus): boolean {
  return status === "switching-chain" || status === "signing" || status === "confirming";
}

// Withdraw form for one smart wallet. Asset options omit zero balances.
export function WithdrawDialog({
  open,
  onOpenChange,
  spaceAddress,
  chainBalances,
  onSuccess,
}: WithdrawDialogProps) {
  const nativeWithdraw = useWithdrawNative();
  const erc20Withdraw = useWithdrawERC20();

  const [chainId, setChainId] = useState(SUPPORTED_CHAINS[0].id);
  const [symbol, setSymbol] = useState<SupportedToken | "">("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [attempted, setAttempted] = useState(false);

  const fundedSymbols = fundedTokensForChain(chainBalances, chainId);
  const selectedBalance = symbol
    ? (chainBalances?.[chainId]?.tokens[symbol] ?? "0")
    : "0";

  const networkItems: SelectItemOption[] = SUPPORTED_CHAINS.map((chain) => ({
    label: chain.name ?? `Chain ${chain.id}`,
    value: String(chain.id),
  }));

  const assetItems: SelectItemOption[] =
    fundedSymbols.length === 0
      ? [{ label: "No funded assets", value: null }]
      : fundedSymbols.map((item) => ({ label: item, value: item }));

  const amountNumber = Number(amount);
  const balanceNumber = Number(selectedBalance);
  const amountInvalid =
    amount.length > 0 && (!Number.isFinite(amountNumber) || amountNumber <= 0 || amountNumber > balanceNumber);
  const recipientInvalid = recipient.length > 0 && !RECIPIENT_PATTERN.test(recipient);
  const showAmountError = attempted || amount.length > 0 ? amountInvalid || (attempted && amount.length === 0) : false;
  const showRecipientError =
    attempted || recipient.length > 0 ? recipientInvalid || (attempted && recipient.length === 0) : false;

  const status: WithdrawStatus =
    [nativeWithdraw.status, erc20Withdraw.status].find((value) => value !== "idle") ?? "idle";
  const busy = isBusy(status);

  const balancesRef = useRef(chainBalances);
  balancesRef.current = chainBalances;
  const resetNative = nativeWithdraw.reset;
  const resetErc20 = erc20Withdraw.reset;

  useEffect(() => {
    if (!open) {
      return;
    }
    resetNative();
    resetErc20();
    // Read balances at open time. A later refetch must not reset the form.
    const currentBalances = balancesRef.current;
    const nextChainId = firstFundedChainId(currentBalances);
    const nextSymbols = fundedTokensForChain(currentBalances, nextChainId);
    setChainId(nextChainId);
    setSymbol(nextSymbols[0] ?? "");
    setAmount("");
    setRecipient("");
    setAttempted(false);
  }, [open, resetNative, resetErc20]);

  const onChainChange = (value: string | null) => {
    if (!value) {
      return;
    }
    const nextChainId = Number(value);
    setChainId(nextChainId);
    const nextSymbols = fundedTokensForChain(chainBalances, nextChainId);
    setSymbol(nextSymbols[0] ?? "");
    setAmount("");
  };

  const onAssetChange = (value: string | null) => {
    if (!value) {
      return;
    }
    setSymbol(value as SupportedToken);
    setAmount("");
  };

  const onConfirm = async () => {
    setAttempted(true);
    if (!symbol || amount.length === 0 || recipient.length === 0 || amountInvalid || recipientInvalid) {
      return;
    }

    const tokenAddress = getTokenAddress(symbol, chainId);
    const useNative =
      symbol === getNativeTokenSymbol(chainId) || isNativeTokenAddress(tokenAddress);

    try {
      if (useNative) {
        await nativeWithdraw.execute({
          chainId,
          spaceAddress,
          to: recipient as `0x${string}`,
          amount,
        });
      } else {
        await erc20Withdraw.execute({
          chainId,
          spaceAddress,
          to: recipient as `0x${string}`,
          token: tokenAddress as `0x${string}`,
          amount,
          decimals: getTokenDecimals(symbol),
        });
      }
      toast.success("Withdraw submitted.");
      onOpenChange(false);
      onSuccess();
    } catch (caught) {
      const error = (caught instanceof Error ? caught : new Error("Withdraw failed.")) as Error & {
        cancelled?: boolean;
      };
      // The user rejects the signature. Keep the dialog open.
      if (error.cancelled) {
        toast("Signature cancelled.");
        return;
      }
      toast.error(shortErrorMessage(error));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Do not close the dialog while the wallet prompt is in progress.
        if (busy && !nextOpen) {
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw</DialogTitle>
          <DialogDescription>Send tokens from this smart wallet to a recipient address.</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>Network</FieldLabel>
            <Select items={networkItems} value={String(chainId)} onValueChange={onChainChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {networkItems.map((item) =>
                    item.value ? (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ) : null
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Asset</FieldLabel>
            <Select
              items={assetItems}
              value={symbol || null}
              onValueChange={onAssetChange}
              disabled={fundedSymbols.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {assetItems.map((item) =>
                    item.value ? (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ) : null
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field data-invalid={showAmountError || undefined}>
            <FieldLabel htmlFor="withdraw-amount">Amount</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="withdraw-amount"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                aria-invalid={showAmountError || undefined}
                disabled={!symbol}
                onChange={(event) => setAmount(event.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  onClick={() => setAmount(selectedBalance)}
                  disabled={!symbol}
                >
                  Max
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {showAmountError ? (
              <FieldError>
                {amount.length === 0 || !Number.isFinite(amountNumber) || amountNumber <= 0
                  ? "Enter an amount greater than 0."
                  : "Amount cannot exceed the token balance."}
              </FieldError>
            ) : null}
          </Field>

          <Field data-invalid={showRecipientError || undefined}>
            <FieldLabel htmlFor="withdraw-recipient">Recipient</FieldLabel>
            <Input
              id="withdraw-recipient"
              autoComplete="off"
              spellCheck={false}
              value={recipient}
              aria-invalid={showRecipientError || undefined}
              placeholder="0x"
              onChange={(event) => setRecipient(event.target.value.trim())}
            />
            {showRecipientError ? <FieldError>Enter a valid 0x address.</FieldError> : null}
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void onConfirm()} disabled={busy || fundedSymbols.length === 0}>
            {busy ? <Spinner data-icon="inline-start" /> : null}
            {confirmLabel(status)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
