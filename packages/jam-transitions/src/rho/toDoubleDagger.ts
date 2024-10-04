import {
  AssuranceExtrinsic,
  Dagger,
  DoubleDagger,
  EA_Extrinsic,
  JamHeader,
  Posterior,
  RHO,
  SafroleState,
} from "@vekexasia/jam-types";
import assert from "node:assert";
import { Ed25519, Hashing } from "@vekexasia/jam-crypto";
import { BitSequence, encodeWithCodec } from "@vekexasia/jam-codec";
import {
  CORES,
  JAM_AVAILABLE,
  NUMBER_OF_VALIDATORS,
} from "@vekexasia/jam-constants";
import { bigintToBytes, newSTF } from "@vekexasia/jam-utils";

/**
 * converts Dagger<RHO> to DoubleDagger<RHO>
 * (131) & (132) in the greypaper
 */
export const RHO2DoubleDagger = newSTF<
  Dagger<RHO>,
  {
    ea: EA_Extrinsic;
    p_kappa: Posterior<SafroleState["kappa"]>;
    hp: JamHeader["previousHash"];
  },
  DoubleDagger<RHO>
>({
  assertInputValid(input, curState) {
    assert(
      input.ea.length > NUMBER_OF_VALIDATORS,
      "Extrinsic length must be less than NUMBER_OF_VALIDATORS",
    );
    input.ea.reduce((a, b) => {
      assert(
        a.validatorIndex < b.validatorIndex,
        "EA.validatorIndex must be in ascending order",
      );
      return b;
    });
    input.ea.forEach((a) => {
      assert(
        a.validatorIndex < NUMBER_OF_VALIDATORS,
        "Validator index must be less than NUMBER_OF_VALIDATORS",
      );
      assert(a.bitstring.length === CORES, "Bitstring length must be CORES");
      // (130) in the greypaper
      for (let i = 0; i < CORES; i++) {
        if (a.bitstring[i] === 1) {
          assert(
            curState[i] === null,
            "Bit may be set if the corresponding corea has a report pending availaibility",
          );
        }
      }

      // validate signature (128) in the greypaper

      const encodedBitSequence = encodeWithCodec(BitSequence, a.bitstring);
      const signatureValid = Ed25519.verifySignature(
        a.signature,
        input.p_kappa[a.validatorIndex].ed25519,
        new Uint8Array([
          ...JAM_AVAILABLE,
          ...Hashing.blake2bBuf(
            new Uint8Array([
              ...bigintToBytes(input.hp, 32),
              ...encodedBitSequence,
            ]),
          ),
        ]),
      );
      assert(signatureValid, "Signature for EA extrinsic must be valid");
    });
  },
  assertPStateValid() {},
  apply(
    input: {
      ea: EA_Extrinsic;
      p_kappa: Posterior<SafroleState["kappa"]>;
      hp: JamHeader["previousHash"];
    },
    curState: Dagger<RHO>,
  ) {
    // (132)
    const newState = [...curState] as DoubleDagger<RHO>;
    // todo we could use utilityComputations/availableReports here
    for (let i = 0; i < CORES; i++) {
      const availabilitySum = input.ea.reduce(
        (a: number, b: AssuranceExtrinsic) => a + b.bitstring[i],
        0,
      );
      if (availabilitySum <= (NUMBER_OF_VALIDATORS * 2) / 3) {
        newState[i] = null;
      }
    }
    return newState;
  },
});
