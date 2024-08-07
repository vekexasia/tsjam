import {
  BandersnatchKey,
  BandersnatchPrivKey,
  BandersnatchSignature,
} from "@vekexasia/jam-types";
import { bytesToBigInt } from "@vekexasia/jam-codec";

export const Bandersnatch = {
  /**
   * `F_{pubkey}^{message}(context) `
   * @param bytes
   * @param pubkey
   * @param message
   * @param context
   */
  verifySignature(
    bytes: Uint8Array,
    pubkey: BandersnatchKey,
    message: Uint8Array,
    context: Uint8Array,
  ): boolean {
    return true; // TODO: implement
  },
  /**
   * `F_{privkey}^{message}(context) `
   * @param context
   * @param message
   * @param privkey
   */
  sign(
    context: Uint8Array,
    message: Uint8Array,
    privkey: BandersnatchPrivKey,
  ): BandersnatchSignature {
    return bytesToBigInt(new Uint8Array(64)); // TODO: implement
  },
};
