import { createArrayLengthDiscriminator } from "@/length-discriminated/array-length-discriminator.js";
import { IdentityCodec } from "@/identity";

/**
 * Discriminated Length array of Uint8Array codec
 */
export const dlArrayOfUint8ArrayCodec =
  createArrayLengthDiscriminator<Uint8Array[]>(IdentityCodec);
