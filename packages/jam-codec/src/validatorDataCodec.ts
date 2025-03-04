import {
  BandersnatchKey,
  BLSKey,
  ByteArrayOfLength,
  type ValidatorData,
} from "@tsjam/types";
import {
  BandersnatchCodec,
  Ed25519PubkeyCodec,
  fixedSizeIdentityCodec,
} from "@/identity.js";
import { createCodec } from "./utils";
import { JamCodec } from "./codec";
import {
  ArrayOfJSONCodec,
  BufferJSONCodec,
  createJSONCodec,
  Ed25519JSONCodec,
  JC_J,
  JSONCodec,
} from "./json/JsonCodec";

export const ValidatorDataCodec = createCodec<ValidatorData>([
  ["banderSnatch", BandersnatchCodec],
  ["ed25519", Ed25519PubkeyCodec],
  ["blsKey", <JamCodec<BLSKey>>fixedSizeIdentityCodec(144)],
  ["metadata", <JamCodec<ByteArrayOfLength<128>>>fixedSizeIdentityCodec(128)],
]);

export const ValidatorDataJSONCodec = createJSONCodec<
  ValidatorData,
  { bandersnatch: string; ed25519: string; bls: string; metadata: string }
>([
  ["banderSnatch", "bandersnatch", BufferJSONCodec<BandersnatchKey, 32>()],
  ["ed25519", "ed25519", Ed25519JSONCodec()],
  ["blsKey", "bls", BufferJSONCodec<BLSKey, 144>()],
  ["metadata", "metadata", BufferJSONCodec<ByteArrayOfLength<128>, 128>()],
]);

/**
 * Used to encode/decode to/from json the gamma_* and iota/kappa/lambda
 */
export const ValidatorDataArrayJSONCodec = <
  T extends ValidatorData[],
>(): JSONCodec<T, Array<JC_J<typeof ValidatorDataJSONCodec>>> =>
  ArrayOfJSONCodec(ValidatorDataJSONCodec);
