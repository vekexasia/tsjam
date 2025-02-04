import { BLSKey, ByteArrayOfLength, type ValidatorData } from "@tsjam/types";
import {
  BandersnatchCodec,
  Ed25519PubkeyCodec,
  fixedSizeIdentityCodec,
} from "@/identity.js";
import { createCodec } from "./utils";
import { JamCodec } from "./codec";

export const ValidatorDataCodec = createCodec<ValidatorData>([
  ["banderSnatch", BandersnatchCodec],
  ["ed25519", Ed25519PubkeyCodec],
  ["blsKey", <JamCodec<BLSKey>>fixedSizeIdentityCodec(144)],
  ["metadata", <JamCodec<ByteArrayOfLength<128>>>fixedSizeIdentityCodec(128)],
]);
