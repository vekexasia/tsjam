import { JamCodec } from "./codec";
import { HashCodec } from "./identity";
import { createArrayLengthDiscriminator } from "./lengthdiscriminated/arrayLengthDiscriminator";
import { Optional } from "./optional";
import { Hash } from "@tsjam/types";

/**
 * $(0.5.4 - E.9)
 */
export const E_M: JamCodec<Array<Hash | undefined>> =
  createArrayLengthDiscriminator(new Optional(HashCodec));
