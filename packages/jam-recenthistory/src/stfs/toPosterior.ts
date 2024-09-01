import {
  Dagger,
  Hash,
  MerkeTreeRoot,
  Posterior,
  ServiceIndex,
  WorkPackageHash,
  newSTF,
} from "@vekexasia/jam-types";
import { RecentHistory, RecentHistoryItem } from "@/type.js";
import {
  appendMMR,
  wellBalancedBinaryMerkleRoot,
} from "@vekexasia/jam-merklization";
import {
  E_4,
  bigintToExistingBytes,
  bytesToBigInt,
} from "@vekexasia/jam-codec";
import { Hashing } from "@vekexasia/jam-crypto";
import { SIZE_OF_RECENT_HISTORY } from "@/consts.js";

export const calculateAccumulateRoot = (
  input: Array<{ serviceIndex: ServiceIndex; accummulationResult: Hash }>,
): MerkeTreeRoot => {
  // accumulate root
  const r = wellBalancedBinaryMerkleRoot(
    input.map((entry) => {
      const b = new Uint8Array(32 + 4);
      E_4.encode(BigInt(entry.serviceIndex), b);
      bigintToExistingBytes(entry.accummulationResult, b.subarray(4));
      return b;
    }),
    Hashing.keccak256,
  );
  return r;
};

/**
 * see (82) (162) (163)
 */
export const recentHistoryToPosterior = newSTF<
  Dagger<RecentHistory>,
  {
    // the result of accummulation merkle tree build
    accumulateRoot: MerkeTreeRoot;
    headerHash: Hash;
    workPackageHashes: WorkPackageHash[];
  },
  Posterior<RecentHistory>
>((input, curState) => {
  const toRet = curState.slice();
  const lastMMR =
    curState.length === 0
      ? []
      : curState[curState.length - 1].accumulationResultMMR;
  const b = appendMMR<Hash>(
    lastMMR,
    input.accumulateRoot,
    (rn: Hash, l: Hash) => {
      const a = new Uint8Array(32 * 2);
      bigintToExistingBytes(rn, a.subarray(0, 32));
      bigintToExistingBytes(l, a.subarray(32, 64));
      return bytesToBigInt(Hashing.keccak256(a));
    },
  );

  toRet.push({
    accumulationResultMMR: b,
    headerHash: input.headerHash,
    stateRoot: 0n as MerkeTreeRoot,
    reportedPackages:
      input.workPackageHashes as RecentHistoryItem["reportedPackages"],
  });

  if (toRet.length > SIZE_OF_RECENT_HISTORY) {
    return toRet.slice(
      toRet.length - SIZE_OF_RECENT_HISTORY,
    ) as Posterior<RecentHistory>;
  }
  return toRet as Posterior<RecentHistory>;
});
