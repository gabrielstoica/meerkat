// Factory adapter contract for smart-account discovery.

export type FactoryAdapter = {
  id: string;
  label: string;
  // Returns smart-account addresses owned by this EOA on this chain.
  listAccounts: (eoa: `0x${string}`, chainId: number) => Promise<`0x${string}`[]>;
  // True when withdraw must use Space.withdrawNative / withdrawERC20.
  usesSpaceWithdraw: boolean;
};
