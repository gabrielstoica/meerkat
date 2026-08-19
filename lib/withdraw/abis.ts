// Space function ABIs used by the withdraw send path.

// ABI for Space.execute. Runs one call on an allowlisted module or the Space itself.
export const SPACE_EXECUTE_ABI = {
  type: "function",
  name: "execute",
  inputs: [
    { name: "module", type: "address", internalType: "address" },
    { name: "value", type: "uint256", internalType: "uint256" },
    { name: "data", type: "bytes", internalType: "bytes" },
  ],
  outputs: [{ name: "success", type: "bool", internalType: "bool" }],
  stateMutability: "nonpayable",
} as const;

// ABI for Space.withdrawNative.
export const WITHDRAW_NATIVE_ABI = {
  type: "function",
  name: "withdrawNative",
  inputs: [
    { name: "to", type: "address", internalType: "address" },
    { name: "amount", type: "uint256", internalType: "uint256" },
  ],
  outputs: [],
  stateMutability: "nonpayable",
} as const;

// ABI for Space.withdrawERC20.
export const WITHDRAW_ERC20_ABI = {
  type: "function",
  name: "withdrawERC20",
  inputs: [
    { name: "to", type: "address", internalType: "address" },
    { name: "token", type: "address", internalType: "contract IERC20" },
    { name: "amount", type: "uint256", internalType: "uint256" },
  ],
  outputs: [],
  stateMutability: "nonpayable",
} as const;
