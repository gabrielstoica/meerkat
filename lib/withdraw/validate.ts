import { z } from "zod";
import { toUnits } from "thirdweb";

// Digits with an optional fraction. Rejects e / E and signs.
const DECIMAL_AMOUNT_PATTERN = /^\d+(?:\.\d+)?$/;
const RECIPIENT_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export const AMOUNT_REQUIRED_MESSAGE = "Enter an amount greater than 0.";
export const AMOUNT_OVER_BALANCE_MESSAGE = "Amount cannot exceed the token balance.";
export const RECIPIENT_INVALID_MESSAGE = "Enter a valid 0x address.";

export type WithdrawFormValues = {
  chainId: number;
  symbol: string;
  amount: string;
  recipient: string;
};

export type WithdrawFormContext = {
  balance: string;
  decimals: number | undefined;
};

// Parses a decimal amount into integer token units. Rejects scientific notation.
function parseDecimalUnits(value: string, decimals: number): bigint | null {
  if (!DECIMAL_AMOUNT_PATTERN.test(value)) {
    return null;
  }
  try {
    return toUnits(value, decimals);
  } catch {
    return null;
  }
}

// Zod schema for withdraw fields. Amount rules use the current asset balance/decimals.
export function createWithdrawFormSchema({ balance, decimals }: WithdrawFormContext) {
  return z.object({
    chainId: z.number(),
    symbol: z.string().min(1, "Select an asset."),
    amount: z
      .string()
      .trim()
      .min(1, AMOUNT_REQUIRED_MESSAGE)
      .superRefine((value, ctx) => {
        if (decimals === undefined) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: AMOUNT_REQUIRED_MESSAGE });
          return;
        }

        const amountUnits = parseDecimalUnits(value, decimals);
        const balanceUnits = parseDecimalUnits(balance, decimals);

        if (amountUnits === null || amountUnits <= BigInt(0)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: AMOUNT_REQUIRED_MESSAGE });
          return;
        }

        if (balanceUnits === null || amountUnits > balanceUnits) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: AMOUNT_OVER_BALANCE_MESSAGE });
        }
      }),
    recipient: z.string().regex(RECIPIENT_PATTERN, RECIPIENT_INVALID_MESSAGE),
  });
}
