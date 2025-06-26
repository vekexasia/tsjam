import { Beta, JamState, Posterior, ServiceIndex } from "@tsjam/types";
import { ok } from "neverthrow";
import { STF } from "@tsjam/types";
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
 * $(0.7.0 - 7.6 / 7.7)
 */
export const beefyBeltToPosterior: STF<
  Beta["beefyBelt"],
  { p_theta: JamState["mostRecentAccumulationOutputs"] },
  never,
  Posterior<Beta["beefyBelt"]>
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
