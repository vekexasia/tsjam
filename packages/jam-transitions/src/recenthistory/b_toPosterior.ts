import {
  Dagger,
  JamHeader,
  JamState,
  Posterior,
  ServiceIndex,
} from "@tsjam/types";
import { ok } from "neverthrow";
import { STF } from "@tsjam/types";
import { RecentHistory } from "@tsjam/types";
import {
  createCodec,
  E_sub_int,
  encodeWithCodec,
  HashCodec,
} from "@tsjam/codec";
import { appendMMR, wellBalancedBinaryMerkleRoot } from "@tsjam/merklization";
import { Hashing } from "@tsjam/crypto";
import { toPosterior } from "@tsjam/utils";

const sCodec = createCodec<JamState["mostRecentAccumulationOutputs"][0]>([
  ["serviceIndex", E_sub_int<ServiceIndex>(4)],
  ["accumulationResult", HashCodec],
]);
/**
 * $(0.6.7 - 7.6 / 7.7)
 */
export const recentHistoryBToPosterior: STF<
  RecentHistory["b"],
  { p_theta: JamState["mostRecentAccumulationOutputs"] },
  never,
  Posterior<RecentHistory["b"]>
> = (input, curState) => {
  const s = input.p_theta.map((a) => encodeWithCodec(sCodec, a));
  return ok(
    toPosterior(
      appendMMR(
        curState,
        wellBalancedBinaryMerkleRoot(s, Hashing.keccak256),
        Hashing.keccak256,
      ),
    ),
  );
};
