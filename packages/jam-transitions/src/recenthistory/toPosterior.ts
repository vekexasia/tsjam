import {
  Dagger,
  EG_Extrinsic,
  Hash,
  MerkeTreeRoot,
  Posterior,
  STF,
  ServiceIndex,
} from "@tsjam/types";
import { appendMMR, wellBalancedBinaryMerkleRoot } from "@tsjam/merklization";
import { E_4 } from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import { RecentHistory } from "@tsjam/types";
import { bigintToExistingBytes } from "@tsjam/utils";
import { RECENT_HISTORY_LENGTH } from "@tsjam/constants";
import { ok } from "neverthrow";

/**
 * $(0.5.0 - 7.3)
 * calculate `r`
 */
export const calculateAccumulateRoot = (
  beefyCommitment: Set<{
    serviceIndex: ServiceIndex;
    accumulationResult: Hash;
  }>,
): MerkeTreeRoot => {
  // accumulate root
  const r = wellBalancedBinaryMerkleRoot(
    [...beefyCommitment.values()]
      // sorting is set in (83)
      .sort((a, b) => a.serviceIndex - b.serviceIndex)
      .map((entry) => {
        const b = new Uint8Array(32 + 4);
        E_4.encode(BigInt(entry.serviceIndex), b);
        bigintToExistingBytes(entry.accumulationResult, b.subarray(4));
        return b;
      }),
    Hashing.keccak256,
  );
  return r;
};

/**
 * see (83) (162) (163)
 */
export const recentHistoryToPosterior: STF<
  Dagger<RecentHistory>,
  {
    // the result of accummulation merkle tree build
    accumulateRoot: MerkeTreeRoot;
    headerHash: Hash;
    eg: EG_Extrinsic;
  },
  never,
  Posterior<RecentHistory>
> = (input, curState) => {
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
      return Hashing.keccak256(a);
    },
  );

  const p = new Map(
    input.eg
      .map((a) => a.workReport)
      .flat()
      .map((a) => a.workPackageSpecification)
      .flat()
      .map((a) => [a.workPackageHash, a.segmentRoot]),
  );
  toRet.push({
    accumulationResultMMR: b,
    headerHash: input.headerHash,
    stateRoot: 0n as MerkeTreeRoot,
    reportedPackages: p,
  });

  // (84)
  if (toRet.length > RECENT_HISTORY_LENGTH) {
    return ok(
      toRet.slice(
        toRet.length - RECENT_HISTORY_LENGTH,
      ) as Posterior<RecentHistory>,
    );
  }
  return ok(toRet as Posterior<RecentHistory>);
};
