import {
  AssuranceExtrinsic,
  Dagger,
  DoubleDagger,
  EA_Extrinsic,
  JamHeader,
  JamState,
  Posterior,
  RHO,
  STF,
} from "@tsjam/types";
import { Ed25519, Hashing } from "@tsjam/crypto";
import { BitSequence, encodeWithCodec } from "@tsjam/codec";
import { CORES, JAM_AVAILABLE, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { bigintToBytes } from "@tsjam/utils";
import { err, ok } from "neverthrow";

export enum RHO2DoubleDaggerError {
  EA_LENGTH = "Extrinsic length must be <= than NUMBER_OF_VALIDATORS",
  VALIDATOR_INDEX = "EA.validatorIndex must be in ascending order",
  VALIDATOR_INDEX_LESS = "Validator index must be less than NUMBER_OF_VALIDATORS",
  CORES = "Bitstring length must be CORES",
  REPORT_PENDING = "Bit may be set if the corresponding core has a report pending availability",
  SIGNATURE = "EA signature must be valid",
}

/**
 * converts Dagger<RHO> to DoubleDagger<RHO>
 * (131) & (132) in the greypaper
 */
export const RHO2DoubleDagger: STF<
  Dagger<RHO>,
  {
    ea: EA_Extrinsic;
    p_kappa: Posterior<JamState["kappa"]>;
    hp: JamHeader["parent"];
  },
  RHO2DoubleDaggerError,
  DoubleDagger<RHO>
> = (input, curState) => {
  if (input.ea.length <= NUMBER_OF_VALIDATORS) {
    return err(RHO2DoubleDaggerError.EA_LENGTH);
  }
  for (let i = 1; i < input.ea.length; i++) {
    if (input.ea[i].validatorIndex < input.ea[i - 1].validatorIndex) {
      return err(RHO2DoubleDaggerError.VALIDATOR_INDEX);
    }
  }
  for (let i = 0; i < input.ea.length; i++) {
    const a = input.ea[i];
    if (a.validatorIndex >= NUMBER_OF_VALIDATORS) {
      return err(RHO2DoubleDaggerError.VALIDATOR_INDEX_LESS);
    }
    if (a.bitstring.length !== CORES) {
      return err(RHO2DoubleDaggerError.CORES);
    }
    // (130) in the greypaper
    for (let j = 0; j < CORES; j++) {
      if (a.bitstring[i] === 1) {
        if (curState[i] !== null) {
          return err(RHO2DoubleDaggerError.REPORT_PENDING);
        }
      }
    }

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
    if (!signatureValid) {
      return err(RHO2DoubleDaggerError.SIGNATURE);
    }
  }

  const newState = [...curState] as DoubleDagger<RHO>;
  // todo we could use utilityComputations/availableReports here
  for (let i = 0; i < CORES; i++) {
    const availabilitySum = input.ea.reduce(
      (a: number, b: AssuranceExtrinsic) => a + b.bitstring[i],
      0,
    );
    if (availabilitySum <= (NUMBER_OF_VALIDATORS * 2) / 3) {
      newState[i] = undefined;
    }
  }
  return ok(newState);
};
