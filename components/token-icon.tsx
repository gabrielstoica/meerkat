import Image from "next/image";
import type { SupportedToken } from "@/lib/tokens";
import { cn } from "@/lib/utils";

const TOKEN_ICON_SRC: Record<SupportedToken, string> = {
  ETH: "/assets/symbols/eth-token.svg",
  UETH: "/assets/symbols/ueth.svg",
  USDC: "/assets/symbols/usdc.svg",
  EURC: "/assets/symbols/eurc.svg",
  USDT: "/assets/symbols/usdt.svg",
  USDT0: "/assets/symbols/usdt0.svg",
  HYPE: "/assets/symbols/hype.svg",
  ZCHF: "/assets/symbols/zchf.svg",
  XSGD: "/assets/symbols/xsgd.svg",
  JPYC: "/assets/symbols/jpyc.svg",
  TGBP: "/assets/symbols/tgbp.svg",
};

type TokenIconProps = {
  symbol: SupportedToken;
  size?: number;
  className?: string;
};

// Renders the brand mark for a supported token from /public/assets/symbols.
export function TokenIcon({ symbol, size = 20, className }: TokenIconProps) {
  return (
    <Image
      alt=""
      src={TOKEN_ICON_SRC[symbol]}
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden
    />
  );
}

const CHAIN_ICON_SRC: Record<number, string> = {
  1: "/assets/symbols/eth-chain.svg",
  8453: "/assets/symbols/base.svg",
  999: "/assets/symbols/hype.svg",
};

type ChainIconProps = {
  chainId: number;
  size?: number;
  className?: string;
};

// Renders the network mark for a supported chain, when an icon exists.
export function ChainIcon({ chainId, size = 16, className }: ChainIconProps) {
  const src = CHAIN_ICON_SRC[chainId];
  if (!src) {
    return null;
  }

  return (
    <Image
      alt=""
      src={src}
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden
    />
  );
}
