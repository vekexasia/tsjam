import {
  ED25519PublicKey,
  ED25519PrivateKey,
  ED25519Signature,
} from "@vekexasia/jam-types";
import { bytesToBigInt } from "@vekexasia/jam-codec";

export const Bandersnatch = {
  /**
   * `E_{pubkey}(message) `
   * @param bytes
   * @param pubkey
   * @param message
   * @param context
   */
  verifySignature(
    bytes: Uint8Array,
    pubkey: ED25519PublicKey,
    message: Uint8Array,
  ): boolean {
    return true; // TODO: implement
  },
  /**
   * `E_{privkey}(message) `
   * @param message
   * @param privkey
   */
  sign(message: Uint8Array, privkey: ED25519PrivateKey): ED25519Signature {
    return bytesToBigInt(new Uint8Array(64)); // TODO: implement
  },
};
