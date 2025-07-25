import {
  BandersnatchSignature,
  ED25519PublicKey,
  JamBlock,
  JamHeader,
  JamState,
  SignedJamHeader,
  ValidatorData,
  Tau,
  Posterior,
  ValidatorIndex,
  BandersnatchKey,
  StateRootHash,
} from "@tsjam/types";
import { Bandersnatch } from "@tsjam/crypto";
import { computeExtrinsicHash, sealSignContext } from "./verifySeal";
import { bigintToBytes, toPosterior, Timekeeping } from "@tsjam/utils";
import { JAM_ENTROPY } from "@tsjam/constants";
import { encodeWithCodec, UnsignedHeaderCodec } from "@tsjam/codec";

/**
 * Creates a block given current state and some data
 */
export const createBlock = (
  curState: JamState,
  data: {
    previousBlock: JamBlock;
    validator: ValidatorData;
    bandersnatchPrivateKey: BandersnatchKey;
  },
): JamBlock => {};
