import {
  Dagger,
  Hash,
  MerkeTreeRoot,
  newSTF,
  Posterior,
  ServiceIndex,
} from "@vekexasia/jam-types";
import { RecentHistory } from "@/type.js";
import {
  appendMMR,
  wellBalancedBinaryMerkleRoot,
} from "@vekexasia/jam-merklization";
import {
  bigintToBytes,
  bigintToExistingBytes,
  bytesToBigInt,
  E_4,
} from "@vekexasia/jam-codec";
import { Hashing } from "@vekexasia/jam-crypto";
import { EG_Extrinsic } from "@vekexasia/jam-work";
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

export const fromEGToWorkReports = (
  EG: EG_Extrinsic,
): RecentHistory["0"]["workReports"] => {
  return EG.map(
    (e) => e.workReport.workPackageSpecification.workPackageHash,
  ) as RecentHistory["0"]["workReports"];
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
    EG: EG_Extrinsic;
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
    workReports: fromEGToWorkReports(input.EG),
  });

  if (toRet.length > SIZE_OF_RECENT_HISTORY) {
    return toRet.slice(
      toRet.length - SIZE_OF_RECENT_HISTORY,
    ) as Posterior<RecentHistory>;
  }
  return toRet as Posterior<RecentHistory>;
});
