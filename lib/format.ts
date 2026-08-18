// Formats addresses, token amounts, and USD amounts for display.

// Shortens a hex address for display.
export function shortenAddress(address: string): string {
  // Keep short values unchanged.
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

// Formats a token amount for display, showing at most three decimal places.
export function formatTokenAmount(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return "0";
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
    useGrouping: false,
  }).format(amount);
}

// Formats a number as a USD amount.
export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
