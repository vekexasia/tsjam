import { Hash } from "@tsjam/types";
import { HashCodec, IdentityCodec } from "@/identity.js";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";

/**
 * Discriminated Length array of hashes codec
 */
export const dlArrayOfHashesCodec =
  createArrayLengthDiscriminator<Hash[]>(HashCodec);

/**
 * Discriminated Length array of Uint8Array codec
 */
export const dlArrayOfUint8ArrayCodec =
  createArrayLengthDiscriminator<Uint8Array[]>(IdentityCodec);
