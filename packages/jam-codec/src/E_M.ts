import { JamCodec } from "./codec";
import { HashCodec } from "./identity";
import { createArrayLengthDiscriminator } from "./lengthdiscriminated/arrayLengthDiscriminator";
import { Optional } from "./optional";
import { Hash } from "@tsjam/types";

export const E_M: JamCodec<Array<Hash | undefined>> =
  createArrayLengthDiscriminator(new Optional(HashCodec));
