import { getContract, readContract } from "thirdweb";
import { STATION_REGISTRY_ADDRESS } from "@/lib/constants";
import { client, withRpcFallback } from "@/lib/thirdweb";
import type { FactoryAdapter } from "./types";

const GET_ACCOUNTS_OF_SIGNER_ABI = {
  type: "function",
  name: "getAccountsOfSigner",
  inputs: [{ name: "signer", type: "address" }],
  outputs: [{ type: "address[]" }],
  stateMutability: "view",
} as const;

// StationRegistry adapter. Lists Werk Space accounts for an EOA on one chain.
export const stationRegistryAdapter: FactoryAdapter = {
  id: "station-registry",
  label: "Werk Space",
  usesSpaceWithdraw: true,
  // Gets all Space accounts for this EOA on this chain.
  async listAccounts(eoa, chainId) {
    return withRpcFallback(chainId, async (chain) => {
      const contract = getContract({
        address: STATION_REGISTRY_ADDRESS,
        chain,
        client,
      });
      const accounts = await readContract({
        contract,
        method: GET_ACCOUNTS_OF_SIGNER_ABI,
        params: [eoa],
      });
      return accounts as `0x${string}`[];
    });
  },
};
