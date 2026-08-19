"use client";

import { useEffect, useMemo, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ChainIcon, TokenIcon } from "@/components/token-icon";
import { fundedTokensForChain } from "@/components/wallets/wallet-breakdown";
import type { SpaceChainBalances } from "@/lib/balances";
import { formatTokenAmount } from "@/lib/format";
import { useWithdrawERC20 } from "@/lib/hooks/useWithdrawERC20";
import { useWithdrawNative, type WithdrawStatus } from "@/lib/hooks/useWithdrawNative";
import { SUPPORTED_CHAINS } from "@/lib/thirdweb";
import { getNativeTokenSymbol, getTokenAddress, getTokenDecimals, isNativeTokenAddress, type SupportedToken } from "@/lib/tokens";
import { createWithdrawFormSchema, type WithdrawFormValues } from "@/lib/withdraw/validate";

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
  const funded = SUPPORTED_CHAINS.find((chain) => fundedTokensForChain(chainBalances, chain.id).length > 0);
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

// True when this asset must call withdrawNative on the Space.
function usesNativeWithdraw(symbol: SupportedToken, chainId: number): boolean {
  const tokenAddress = getTokenAddress(symbol, chainId);
  return symbol === getNativeTokenSymbol(chainId) || isNativeTokenAddress(tokenAddress);
}

function defaultFormValues(chainBalances: SpaceChainBalances | undefined): WithdrawFormValues {
  const chainId = firstFundedChainId(chainBalances);
  const symbols = fundedTokensForChain(chainBalances, chainId);
  return {
    chainId,
    symbol: symbols[0] ?? "",
    amount: "",
    recipient: "",
  };
}

// Withdraw form for one smart wallet. Asset options omit zero balances.
export function WithdrawDialog({ open, onOpenChange, spaceAddress, chainBalances, onSuccess }: WithdrawDialogProps) {
  const nativeWithdraw = useWithdrawNative();
  const erc20Withdraw = useWithdrawERC20();

  const balancesRef = useRef(chainBalances);
  const resetNative = nativeWithdraw.reset;
  const resetErc20 = erc20Withdraw.reset;

  // Keep the latest balances available to the resolver without writing refs during render.
  useEffect(() => {
    balancesRef.current = chainBalances;
  }, [chainBalances]);

  const form = useForm<WithdrawFormValues>({
    defaultValues: defaultFormValues(undefined),
    mode: "onTouched",
    resolver: async (values, context, options) => {
      const selectedSymbol = values.symbol as SupportedToken | "";
      const decimals = selectedSymbol ? getTokenDecimals(selectedSymbol) : undefined;
      const balance = selectedSymbol ? balancesRef.current?.[values.chainId]?.tokens[selectedSymbol] ?? "0" : "0";
      return zodResolver(createWithdrawFormSchema({ balance, decimals }))(values, context, options);
    },
  });

  const {
    control,
    register,
    reset,
    setValue,
    handleSubmit,
    formState: { errors, touchedFields, isSubmitted },
  } = form;

  const chainId = useWatch({ control, name: "chainId" });
  const symbol = useWatch({ control, name: "symbol" });

  const fundedSymbols = fundedTokensForChain(chainBalances, chainId);
  const selectedSymbol = (symbol || "") as SupportedToken | "";
  const selectedBalance = selectedSymbol ? chainBalances?.[chainId]?.tokens[selectedSymbol] ?? "0" : "0";

  const networkItems: SelectItemOption[] = useMemo(
    () =>
      SUPPORTED_CHAINS.map((chain) => ({
        label: chain.name ?? `Chain ${chain.id}`,
        value: String(chain.id),
      })),
    []
  );

  const assetItems: SelectItemOption[] = useMemo(
    () =>
      fundedSymbols.length === 0
        ? [{ label: "No funded assets", value: null }]
        : fundedSymbols.map((item) => ({ label: item, value: item })),
    [fundedSymbols]
  );

  const useNative = selectedSymbol !== "" && usesNativeWithdraw(selectedSymbol, chainId);
  const activeWithdraw = useNative ? nativeWithdraw : erc20Withdraw;
  // Use only the hook for the selected asset. A stale error on the other hook must not hide a busy state.
  const status: WithdrawStatus = selectedSymbol ? activeWithdraw.status : "idle";
  const busy = isBusy(status);

  const showAmountError = Boolean(errors.amount) && (Boolean(touchedFields.amount) || isSubmitted);
  const showRecipientError = Boolean(errors.recipient) && (Boolean(touchedFields.recipient) || isSubmitted);

  useEffect(() => {
    if (!open) {
      return;
    }
    resetNative();
    resetErc20();
    // Read balances at open time. A later refetch must not reset the form.
    reset(defaultFormValues(balancesRef.current));
  }, [open, reset, resetNative, resetErc20]);

  const onChainChange = (value: string | null) => {
    if (!value) {
      return;
    }
    const nextChainId = Number(value);
    const nextSymbols = fundedTokensForChain(chainBalances, nextChainId);
    setValue("chainId", nextChainId, { shouldValidate: false });
    setValue("symbol", nextSymbols[0] ?? "", { shouldValidate: false });
    setValue("amount", "", { shouldValidate: false, shouldTouch: false });
  };

  const onAssetChange = (value: string | null) => {
    if (!value) {
      return;
    }
    setValue("symbol", value as SupportedToken, { shouldValidate: false });
    setValue("amount", "", { shouldValidate: false, shouldTouch: false });
  };

  const onConfirm = handleSubmit(async (values) => {
    if (!values.symbol) {
      return;
    }

    const selectedSymbol = values.symbol as SupportedToken;
    const tokenAddress = getTokenAddress(selectedSymbol, values.chainId);

    try {
      if (usesNativeWithdraw(selectedSymbol, values.chainId)) {
        await nativeWithdraw.execute({
          chainId: values.chainId,
          spaceAddress,
          to: values.recipient as `0x${string}`,
          amount: values.amount,
        });
      } else {
        await erc20Withdraw.execute({
          chainId: values.chainId,
          spaceAddress,
          to: values.recipient as `0x${string}`,
          token: tokenAddress as `0x${string}`,
          amount: values.amount,
          decimals: getTokenDecimals(selectedSymbol),
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
  });

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
      <DialogContent className="border-border/80 bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Withdraw</DialogTitle>
          <DialogDescription>Send tokens from this smart wallet to a recipient address.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onConfirm();
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel>Network</FieldLabel>
              <Controller
                control={control}
                name="chainId"
                render={({ field }) => (
                  <Select items={networkItems} value={String(field.value)} onValueChange={onChainChange} disabled={busy}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: string | null) => {
                          const selectedId = Number(value);
                          const chain = SUPPORTED_CHAINS.find((entry) => entry.id === selectedId);
                          if (!chain) {
                            return null;
                          }
                          return (
                            <span className="flex items-center gap-2">
                              <ChainIcon chainId={chain.id} size={16} />
                              <span>{chain.name ?? `Chain ${chain.id}`}</span>
                            </span>
                          );
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        {SUPPORTED_CHAINS.map((chain) => (
                          <SelectItem key={chain.id} value={String(chain.id)}>
                            <span className="flex items-center gap-2">
                              <ChainIcon chainId={chain.id} size={16} />
                              <span>{chain.name ?? `Chain ${chain.id}`}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field>
              <FieldLabel>Asset</FieldLabel>
              <Controller
                control={control}
                name="symbol"
                render={({ field }) => (
                  <Select
                    items={assetItems}
                    value={field.value || null}
                    onValueChange={onAssetChange}
                    disabled={busy || fundedSymbols.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No funded assets">
                        {(value: string | null) => {
                          if (!value) {
                            return "No funded assets";
                          }
                          const selected = value as SupportedToken;
                          return (
                            <span className="flex items-center gap-2">
                              <TokenIcon symbol={selected} size={16} />
                              <span>{selected}</span>
                            </span>
                          );
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        {fundedSymbols.map((item) => (
                          <SelectItem key={item} value={item}>
                            <span className="flex items-center gap-2">
                              <TokenIcon symbol={item} size={16} />
                              <span>{item}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field data-invalid={showAmountError || undefined}>
              <FieldLabel htmlFor="withdraw-amount">Amount</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="withdraw-amount"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  aria-invalid={showAmountError || undefined}
                  disabled={busy || !selectedSymbol}
                  {...register("amount")}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    onClick={() => setValue("amount", selectedBalance, { shouldValidate: true, shouldTouch: true })}
                    disabled={busy || !selectedSymbol}
                  >
                    Max
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              {selectedSymbol ? (
                <FieldDescription>
                  Available <span className="font-mono tabular-nums text-foreground">{formatTokenAmount(selectedBalance)}</span>{" "}
                  {selectedSymbol}
                </FieldDescription>
              ) : null}
              {showAmountError && errors.amount?.message ? <FieldError>{errors.amount.message}</FieldError> : null}
            </Field>

            <Field data-invalid={showRecipientError || undefined}>
              <FieldLabel htmlFor="withdraw-recipient">Recipient</FieldLabel>
              <Input
                id="withdraw-recipient"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={showRecipientError || undefined}
                placeholder="0x"
                disabled={busy}
                {...register("recipient", {
                  setValueAs: (value: string) => value.trim(),
                })}
              />
              {showRecipientError && errors.recipient?.message ? <FieldError>{errors.recipient.message}</FieldError> : null}
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-copper text-copper-foreground hover:bg-copper/90"
              disabled={busy || fundedSymbols.length === 0}
            >
              {busy ? <Spinner data-icon="inline-start" /> : null}
              {confirmLabel(status)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
