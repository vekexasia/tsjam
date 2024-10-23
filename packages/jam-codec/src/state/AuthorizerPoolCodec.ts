import { JamCodec } from "@/codec";
import { HashCodec } from "@/identity";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator";
import { createSequenceCodec } from "@/sequenceCodec";
import { CORES } from "@tsjam/constants";
import { AuthorizerPool } from "@tsjam/types";

export const AuthorizerPoolCodec: JamCodec<AuthorizerPool> =
  createSequenceCodec(CORES, createArrayLengthDiscriminator(HashCodec));
