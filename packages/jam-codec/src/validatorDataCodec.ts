import { BLSKey, type ValidatorData } from "@tsjam/types";
import {
  BandersnatchCodec,
  Ed25519PubkeyCodec,
  fixedSizeIdentityCodec,
} from "@/identity.js";
import { createCodec } from "./utils";

export const ValidatorDataCodec = createCodec<ValidatorData>([
  ["banderSnatch", BandersnatchCodec],
  ["ed25519", Ed25519PubkeyCodec],
  ["blsKey", fixedSizeIdentityCodec<144, BLSKey>(144)],
  ["metadata", fixedSizeIdentityCodec<128>(128)],
]);
